$f = 'c:\Users\HP\dashboard9\client\src\pages\chlorine\DetailedChlorinePage.tsx'
$c = [System.IO.File]::ReadAllText($f)

# The goal is to append &agencyType=... to any export URL that uses params.toString()
# We use -replace with regex. We must escape $ in the replacement string.

# Matches ?${params.toString()} and appends the conditional agencyType
$c = $c -replace '\?(\$\{params\.toString\(\)\})', '?$1${selectedAgencyType !== "ALL" ? "&agencyType=" + selectedAgencyType : ""}'

[System.IO.File]::WriteAllText($f, $c)
Write-Output "Successfully updated export URLs in DetailedChlorinePage.tsx"
