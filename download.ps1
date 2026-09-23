$urls = @{
    "sun.jpg" = "https://www.solarsystemscope.com/textures/download/2k_sun.jpg"
    "mercury.jpg" = "https://www.solarsystemscope.com/textures/download/2k_mercury.jpg"
    "venus.jpg" = "https://www.solarsystemscope.com/textures/download/2k_venus_surface.jpg"
    "earth.jpg" = "https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg"
    "mars.jpg" = "https://www.solarsystemscope.com/textures/download/2k_mars.jpg"
    "jupiter.jpg" = "https://www.solarsystemscope.com/textures/download/2k_jupiter.jpg"
    "saturn.jpg" = "https://www.solarsystemscope.com/textures/download/2k_saturn.jpg"
    "saturn_ring.png" = "https://www.solarsystemscope.com/textures/download/2k_saturn_ring_alpha.png"
    "uranus.jpg" = "https://www.solarsystemscope.com/textures/download/2k_uranus.jpg"
    "neptune.jpg" = "https://www.solarsystemscope.com/textures/download/2k_neptune.jpg"
    "stars.jpg" = "https://www.solarsystemscope.com/textures/download/2k_stars_milky_way.jpg"
    "earth_night.jpg" = "https://www.solarsystemscope.com/textures/download/2k_earth_nightmap.jpg"
    "earth_clouds.jpg" = "https://www.solarsystemscope.com/textures/download/2k_earth_clouds.jpg"
    "moon.jpg" = "https://www.solarsystemscope.com/textures/download/2k_moon.jpg"
    "venus_atmosphere.jpg" = "https://www.solarsystemscope.com/textures/download/2k_venus_atmosphere.jpg"
    "three.module.js" = "https://unpkg.com/three@0.158.0/build/three.module.js"
}

foreach ($key in $urls.Keys) {
    $outFile = Join-Path $PSScriptRoot "assets\$key"
    if (-Not (Test-Path $outFile)) {
        Write-Host "Downloading $key"
        Invoke-WebRequest -Uri $urls[$key] -OutFile $outFile
    } else {
        Write-Host "$key already exists"
    }
}
Write-Host "All downloads completed."
