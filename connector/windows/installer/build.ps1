param(
    [string]$CertificateThumbprint = "",
    [switch]$AllowUnsignedDevelopment
)

$ErrorActionPreference = "Stop"
$codeSigningOid = "1.3.6.1.5.5.7.3.3"
$connectorRoot = Split-Path -Parent $PSScriptRoot
Push-Location $connectorRoot
try {
    python -m PyInstaller --version | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "PyInstaller no esta instalado. Instala las dependencias de desarrollo fijadas antes de empaquetar."
    }
    if (-not $CertificateThumbprint -and -not $AllowUnsignedDevelopment) {
        throw "Una compilacion distribuible requiere CertificateThumbprint. Usa -AllowUnsignedDevelopment solo para validar localmente."
    }
    python -m PyInstaller --noconfirm --clean --onefile --name XCalificatorOllamaConnector xcalificator_ollama_connector/main.py
    if ($LASTEXITCODE -ne 0) {
        throw "PyInstaller no pudo crear el ejecutable."
    }
    $executable = Join-Path $connectorRoot "dist/XCalificatorOllamaConnector.exe"
    if ($CertificateThumbprint) {
        $certificate = Get-Item "Cert:/CurrentUser/My/$CertificateThumbprint"
        if (-not $certificate.HasPrivateKey) {
            throw "El certificado seleccionado no tiene clave privada."
        }
        $supportsCodeSigning = $certificate.EnhancedKeyUsageList.ObjectId.Value -contains $codeSigningOid
        if (-not $supportsCodeSigning) {
            throw "El certificado seleccionado no permite firma de codigo."
        }
        Set-AuthenticodeSignature -FilePath $executable -Certificate $certificate -TimestampServer "http://timestamp.digicert.com" | Out-Null
        $signature = Get-AuthenticodeSignature -FilePath $executable
        if ($signature.Status -ne "Valid") {
            throw "La firma del ejecutable no es valida: $($signature.Status)"
        }
    } else {
        Write-Warning "Ejecutable de desarrollo creado sin firma. No lo distribuyas."
    }
    $hash = Get-FileHash -Algorithm SHA256 -Path $executable
    [PSCustomObject]@{
        Path = $executable
        SHA256 = $hash.Hash
        Signed = [bool]$CertificateThumbprint
    }
}
finally {
    Pop-Location
}
