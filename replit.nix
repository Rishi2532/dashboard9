{pkgs}: {
  deps = [
    pkgs.openssl
    pkgs.zip
    pkgs.unzip
    pkgs.jq
    pkgs.postgresql
  ];
}
