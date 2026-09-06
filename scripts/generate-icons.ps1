# Raster versions of the original vector monogram, for PWA installation.
Add-Type -AssemblyName System.Drawing
$iconDirectory = Join-Path $PSScriptRoot '..\public'
foreach ($iconSize in @(192, 512)) {
    $bitmap = [System.Drawing.Bitmap]::new($iconSize, $iconSize)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#050c17'))
    $graphics.ScaleTransform($iconSize / 512.0, $iconSize / 512.0)
    $cyan = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#5eeaf5'))
    $white = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#dcf8ff'))
    $purple = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#cf59ff'), 8)
    $mark = [System.Drawing.PointF[]]@([System.Drawing.PointF]::new(256,88),[System.Drawing.PointF]::new(393,389),[System.Drawing.PointF]::new(322,389),[System.Drawing.PointF]::new(256,232),[System.Drawing.PointF]::new(190,389),[System.Drawing.PointF]::new(119,389))
    $core = [System.Drawing.PointF[]]@([System.Drawing.PointF]::new(256,291),[System.Drawing.PointF]::new(290,372),[System.Drawing.PointF]::new(256,356),[System.Drawing.PointF]::new(222,372))
    $graphics.FillPolygon($cyan, $mark)
    $graphics.FillPolygon($white, $core)
    $graphics.DrawLine($purple, 128, 432, 384, 432)
    $bitmap.Save((Join-Path $iconDirectory "icon-$iconSize.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $purple.Dispose(); $white.Dispose(); $cyan.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}
