# First stack in this repo to read another stack's remote state: foundation
# and data (core increment, #180), plus account (observability increment,
# #181 - the SNS topic ARN consumed by the alarms in observability.tf).
#
# The upstream states live in HCP Terraform (#203). A terraform_remote_state
# data source reads HCP Terraform through the "remote" backend - there is no
# "cloud" backend for this data source. Each producer workspace grants this
# workspace access explicitly via its remote-state consumer list; no
# organization- or project-wide state sharing is enabled.

data "terraform_remote_state" "foundation" {
  backend = "remote"

  config = {
    organization = "gabor-toth-personalprojects"

    workspaces = {
      name = "itassetpulse-foundation"
    }
  }
}

data "terraform_remote_state" "data" {
  backend = "remote"

  config = {
    organization = "gabor-toth-personalprojects"

    workspaces = {
      name = "itassetpulse-data"
    }
  }
}

data "terraform_remote_state" "account" {
  backend = "remote"

  config = {
    organization = "gabor-toth-personalprojects"

    workspaces = {
      name = "itassetpulse-account"
    }
  }
}
