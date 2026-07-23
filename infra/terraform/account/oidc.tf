resource "aws_iam_openid_connect_provider" "github_actions" {
  count = var.create_oidc_provider ? 1 : 0

  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]

  # thumbprint_list intentionally omitted: for GitHub (and Auth0/GitLab/Google/
  # S3-JWKS-hosted issuers), AWS validates the provider's server certificate
  # against its own trusted root CA library rather than a configured
  # thumbprint, even if one is supplied (hashicorp/aws provider docs for
  # aws_iam_openid_connect_provider, verified at implementation time).
}

data "aws_iam_openid_connect_provider" "github_actions" {
  count = var.create_oidc_provider ? 0 : 1

  url = "https://token.actions.githubusercontent.com"
}
