# First stack in this repo to read another stack's remote state. Only
# foundation and data are read - the account remote state (SNS topic ARN) is
# introduced by #181 together with the alarms that actually consume it; this
# core increment has no use for it (spec §4.5, issue #180).

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
