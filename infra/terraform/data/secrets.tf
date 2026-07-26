locals {
  # Username, password, and appName are URL-encoded because a generated
  # password (or an operator-chosen username/app name) may contain characters
  # that are not valid unescaped in a URI. authSource=admin is explicit
  # because the SCRAM user above is created with auth_database_name = "admin".
  mongo_uri = join("", [
    "mongodb+srv://",
    urlencode(var.atlas_database_username),
    ":",
    urlencode(random_password.mongo_db_user.result),
    "@",
    var.mongodb_atlas_srv_host,
    "/",
    var.mongodb_database_name,
    "?retryWrites=true&w=majority&authSource=admin&appName=",
    urlencode(var.mongodb_atlas_app_name),
  ])
}

resource "aws_secretsmanager_secret" "mongo_uri" {
  name_prefix = "${local.name_prefix}-mongo-uri-"

  # Ephemeral apply/destroy cycle (spec §9): immediate deletion so a
  # short-lived name is never blocked by a pending-deletion secret.
  recovery_window_in_days = 0

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "mongo_uri" {
  secret_id     = aws_secretsmanager_secret.mongo_uri.id
  secret_string = local.mongo_uri
}
