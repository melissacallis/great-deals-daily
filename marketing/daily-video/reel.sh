#!/bin/sh
# Instagram Reel version of a daily video: cover/hook frame first, then the video framed inside
# Instagram's safe area (clear of the top bar, the caption and the right-side buttons).
# sh reel.sh <video.mp4> <cover.png> <out.mp4>
set -e
V="$1"; C="$2"; O="$3"
ffmpeg -v error -y -loop 1 -framerate 30 -t 1.3 -i "$C" \
  -f lavfi -i "gradients=s=1080x1920:c0=0xff3d7f:c1=0xff8a3d:x0=0:y0=0:x1=600:y1=1920:r=30" -i "$V" -filter_complex "\
[2:v]scale=821:1459:flags=lanczos,pad=837:1475:8:8:color=white[v];[1:v][v]overlay=121:176:shortest=1,setsar=1,format=yuv420p[main];\
[0:v]fps=30,format=yuv420p,setsar=1,fade=t=out:st=1.05:d=0.25:color=white[c];[c][main]concat=n=2:v=1:a=0[vout];\
aevalsrc='0.55*sin(2*PI*(900-700*t*6)*t)*exp(-22*t)':s=48000:d=0.3,aformat=channel_layouts=stereo[pop];[2:a]adelay=1300|1300[ra];[pop][ra]amix=inputs=2:normalize=0:duration=longest[aout]" \
  -map "[vout]" -map "[aout]" -c:v libx264 -preset medium -crf 18 -c:a aac -b:a 160k -movflags +faststart "$O"
echo "$O"
