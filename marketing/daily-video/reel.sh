#!/bin/sh
# Instagram Reel version of a daily video: cover/hook frame first, then the video framed inside
# Instagram's safe area (clear of the top bar, the caption and the right-side buttons), over a snowy background.
# 1) python snow-bg.py <cover.png> 1.3 <video length + 1.3> <snowbg.mp4>
# 2) sh reel.sh <video.mp4> <snowbg.mp4> <out.mp4> [pin]
# With "pin", the background is 1000x1500 (Pinterest 2:3) and the video is framed to fit it.
set -e
V="$1"; B="$2"; O="$3"
if [ "$4" = pin ]; then SIZE=778:1384; PAD=794:1400; POS=103:50; else SIZE=821:1459; PAD=837:1475; POS=121:176; fi
ffmpeg -v error -y -i "$B" -i "$V" -filter_complex "\
[1:v]scale=$SIZE:flags=lanczos,pad=$PAD:8:8:color=white,format=yuva420p,fade=t=in:st=0:d=0.3:alpha=1,setpts=PTS+1.3/TB[v];\
[0:v][v]overlay=$POS:eof_action=pass,setsar=1,format=yuv420p[vout];\
aevalsrc='0.55*sin(2*PI*(900-700*t*6)*t)*exp(-22*t)':s=48000:d=0.3,aformat=channel_layouts=stereo[pop];[1:a]adelay=1300|1300[ra];[pop][ra]amix=inputs=2:normalize=0:duration=longest[aout]" \
  -map "[vout]" -map "[aout]" -c:v libx264 -preset medium -crf 18 -c:a aac -b:a 160k -shortest -movflags +faststart "$O"
echo "$O"
