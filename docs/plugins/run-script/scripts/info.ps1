# Prints facts about the repository it runs in; the branch comes as the first argument.
param([string]$Branch)

"Folder:  $(Get-Location)"
"Branch:  $Branch"
"Files:   $((git ls-files | Measure-Object).Count)"
"Commits: $(git rev-list --count HEAD)"
"Script:  $PSScriptRoot"
