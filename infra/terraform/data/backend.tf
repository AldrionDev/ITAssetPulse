terraform {
  # State is stored in HCP Terraform. The workspace runs in Local execution
  # mode: HCP Terraform holds the state, plan/apply still run locally.
  # Authentication comes from `terraform login app.terraform.io`; no token is
  # ever written into this file.
  cloud {
    organization = "gabor-toth-personalprojects"

    workspaces {
      name = "itassetpulse-data"
    }
  }
}
