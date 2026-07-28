# First stack in this repo to read another stack's remote state: foundation
# and data (core increment, #180), plus account (observability increment,
# #181 - the SNS topic ARN consumed by the alarms in observability.tf).

data "terraform_remote_state" "foundation" {
  backend = "s3"

  config = {
    bucket = var.state_bucket
    key    = "itassetpulse/demo/foundation.tfstate"
    region = var.aws_region
  }
}

data "terraform_remote_state" "data" {
  backend = "s3"

  config = {
    bucket = var.state_bucket
    key    = "itassetpulse/demo/data.tfstate"
    region = var.aws_region
  }
}

data "terraform_remote_state" "account" {
  backend = "s3"

  config = {
    bucket = var.state_bucket
    key    = "itassetpulse/global/account.tfstate"
    region = var.aws_region
  }
}
