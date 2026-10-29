# Runs as administrator (see "admin" in the manifest) and says whether it really is.
# The role, not the text 'Administrator', which names the built-in Administrator account.
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$admin = ([Security.Principal.WindowsPrincipal]$identity).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

"User:          $($identity.Name)"
"Administrator: $admin"
"Folder:        $(Get-Location)"
if (-not $admin) {
    [Console]::Error.WriteLine("Not running as administrator.")
    exit 1
}
