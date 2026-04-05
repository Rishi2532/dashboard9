$f = 'c:\Users\HP\dashboard9\client\src\pages\chlorine\DetailedChlorinePage.tsx'
$c = [System.IO.File]::ReadAllText($f)

# Fix 1: Chlorine Day-Wise (and others using this exact line)
$t = 'if (schemeFilter === "fully_completed") params.append("fullyCompleted", "true");'
$r = "if (schemeFilter === 'fully_completed') params.append('fullyCompleted', 'true');`n                                if (selectedAgencyType !== 'ALL') params.append('agencyType', selectedAgencyType);"
$c = $c.Replace($t, $r)

# Fix 2: Pressure Day-Wise (and others using this exact block)
$t = "`n                                if (schemeFilter === `"fully_completed`") {`n                                  params.append(`"fullyCompleted`", `"true`");`n                                }"
$r = "`n                                if (schemeFilter === `"fully_completed`") {`n                                  params.append(`"fullyCompleted`", `"true`");`n                                }`n                                if (selectedAgencyType !== 'ALL') {`n                                  params.append(`"agencyType`", selectedAgencyType);`n                                }"
$c = $c.Replace($t, $r)

# Fix 3: Division Villages (approx line 10918 - double check indentation)
$t = "`n                                        if (schemeFilter === `"fully_completed`") {`n                                          params.append(`"fullyCompleted`", `"true`");`n                                        }"
$r = "`n                                        if (schemeFilter === `"fully_completed`") {`n                                          params.append(`"fullyCompleted`", `"true`");`n                                        }`n                                        if (selectedAgencyType !== 'ALL') {`n                                          params.append(`"agencyType`", selectedAgencyType);`n                                        }"
$c = $c.Replace($t, $r)

[System.IO.File]::WriteAllText($f, $c)
Write-Output "Successfully updated DetailedChlorinePage.tsx"
