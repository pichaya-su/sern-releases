# Works through a few slow steps, telling SERN how far along it is with "##sern[progress]" lines.
$steps = "Checking the files", "Compiling", "Running the tests", "Packing", "Cleaning up"
for ($i = 0; $i -lt $steps.Count; $i++) {
    Write-Output "##sern[progress] $([int](100 * $i / $steps.Count)) $($steps[$i])..."
    Write-Output "Step $($i + 1) of $($steps.Count): $($steps[$i])"
    Start-Sleep -Seconds 1
}
Write-Output "All done."
