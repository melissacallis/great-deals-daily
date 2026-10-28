# Removes background music and keeps the voice, with the UVR MDX-Net Voc_FT model (ONNX).
# python tools-remove-music.py <in audio/video> <model.onnx> <out.wav>
import sys, subprocess, numpy as np, onnxruntime as ort, soundfile as sf
src, model, out = sys.argv[1:4]
SR, N_FFT, HOP, DIM_F, DIM_T, COMPENSATE = 44100, 7680, 1024, 3072, 256, 1.021
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vn', '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
mix = np.frombuffer(raw, np.float32).reshape(-1, 2).T.copy()          # (2, samples)
n_bins = N_FFT // 2 + 1
window = (0.5 - 0.5 * np.cos(2 * np.pi * np.arange(N_FFT) / N_FFT)).astype(np.float32)  # periodic Hann

def stft(x):  # matches torch.stft(center=True, reflect padding)
    x = np.pad(x, ((0, 0), (N_FFT // 2, N_FFT // 2)), mode='reflect')
    n = 1 + (x.shape[1] - N_FFT) // HOP
    idx = np.arange(N_FFT)[None, :] + HOP * np.arange(n)[:, None]
    return np.fft.rfft(x[:, idx] * window, axis=-1).transpose(0, 2, 1)   # (2, bins, frames)

def istft(spec, length):
    frames = np.fft.irfft(spec.transpose(0, 2, 1), n=N_FFT, axis=-1) * window
    n = frames.shape[1]; total = N_FFT + HOP * (n - 1)
    y = np.zeros((2, total)); wsum = np.zeros(total)
    for k in range(n):
        y[:, k * HOP:k * HOP + N_FFT] += frames[:, k]; wsum[k * HOP:k * HOP + N_FFT] += window ** 2
    y /= np.maximum(wsum, 1e-8)
    return y[:, N_FFT // 2:N_FFT // 2 + length]

chunk = HOP * (DIM_T - 1); trim = N_FFT // 2; gen = chunk - 2 * trim
n = mix.shape[1]; pad = gen - n % gen
mix_p = np.concatenate([np.zeros((2, trim)), mix, np.zeros((2, pad + trim))], axis=1)
sess = ort.InferenceSession(model, providers=['CPUExecutionProvider'])
parts = []
for i in range(0, n + pad, gen):
    spec = stft(mix_p[:, i:i + chunk])                                  # (2, 3841, 256)
    x = np.stack([spec[0].real, spec[0].imag, spec[1].real, spec[1].imag])[:, :DIM_F][None].astype(np.float32)
    y = sess.run(None, {'input': x})[0][0]                              # (4, 3072, 256)
    full = np.zeros((2, n_bins, DIM_T), np.complex64)
    full[0, :DIM_F] = y[0] + 1j * y[1]; full[1, :DIM_F] = y[2] + 1j * y[3]
    parts.append(istft(full, chunk)[:, trim:-trim])
voice = np.concatenate(parts, axis=1)[:, :n] * COMPENSATE
sf.write(out, voice.T.astype(np.float32), SR)
print('voice track', out, f'{n / SR:.1f}s')
