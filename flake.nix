{
  description = "Subhatch Dev Environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = {
    self,
    nixpkgs,
  }: let
    supportedSystems = ["x86_64-linux" "aarch64-linux"];
    forAllSystems = nixpkgs.lib.genAttrs supportedSystems;
    nixpkgsFor = forAllSystems (system: import nixpkgs {inherit system;});
  in {
    devShells = forAllSystems (
      system: let
        pkgs = nixpkgsFor.${system};
      in {
        default = pkgs.mkShell {
          buildInputs = with pkgs; [
            bun
          ];
          shellHook = ''
            export PATH="/home/dich/.cache/.bun/bin:$PATH"
            command -v vercel  || bun add -g vercel
            command -v wrangler || bun add -g wrangler
            export PATH="/home/dich/.cache/.bun/bin:$PATH"
          '';
        };
      }
    );
  };
}
