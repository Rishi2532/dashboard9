$f = 'c:\Users\HP\dashboard9\client\src\pages\chlorine\DetailedChlorinePage.tsx'
$c = [System.IO.File]::ReadAllText($f)

# Regex to find window.open calls that use params.toString() and insert agencyType check
# We use a non-greedy match for the content between the start of the block and window.open
$c = [regex]::Replace($c, '(?m)(\s+)(window\.open\((?:(?!\}\);).)*?params\.toString\(\))', {
    param($match)
    $indent = $match.Groups[1].Value
    $call = $match.Groups[2].Value
    
    # Only apply if 'params' is in the context (defined earlier in the block)
    # and 'agencyType' is not already added.
    if ($call -like "*params.toString()*" -and -not ($match.Value -like "*agencyType*")) {
        return $indent + "if (selectedAgencyType !== 'ALL') params.append('agencyType', selectedAgencyType);`n" + $indent + $call
    }
    return $match.Value
})

[System.IO.File]::WriteAllText($f, $c)
Write-Output "Successfully updated DetailedChlorinePage.tsx with global regex"
