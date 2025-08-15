
$bgVid = 'assets/mock/short.mp4'
$mockImg = 'assets/mock/xpost.png'
$outputPath = 'output/smoke_out.mp4'

Start-Process -FilePath "scripts/run-ffmpeg.bat" -ArgumentList $bgVid, $mockImg, "scripts/filter.txt", $outputPath -NoNewWindow -Wait
