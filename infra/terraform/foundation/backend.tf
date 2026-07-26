terraform {
  # Partial configuration: real values come from backend.hcl (git-ignored),
  # supplied via `terraform init -backend-config=backend.hcl`.
  backend "s3" {}
}
