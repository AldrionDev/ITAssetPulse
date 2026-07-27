terraform {
  required_version = ">= 1.10.0"

  required_providers {
    aws = {
      source = "hashicorp/aws"
      # >= 6.19.0: the aws_lb_listener_rule `transform` block (url-rewrite),
      # used by listener.tf to strip the /api prefix, was introduced in this
      # provider version. The constraint must express this minimum itself -
      # relying on the committed lockfile alone would let a stale lockfile
      # silently resolve to an older, incompatible provider.
      version = ">= 6.19.0, < 7.0.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}
