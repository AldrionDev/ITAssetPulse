# JWT_SECRET: Terraform-generated, never a hand-written, version-controlled
# value (spec §9). Same pattern as data/secrets.tf's mongo_uri secret.

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

resource "aws_secretsmanager_secret" "jwt" {
  name_prefix = "${local.name_prefix}-jwt-"

  # Ephemeral apply/destroy cycle (spec §9): immediate deletion so a
  # short-lived name is never blocked by a pending-deletion secret.
  recovery_window_in_days = 0

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "jwt" {
  secret_id     = aws_secretsmanager_secret.jwt.id
  secret_string = random_password.jwt_secret.result
}
