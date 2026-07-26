resource "random_password" "mongo_db_user" {
  length  = 32
  special = true
}

resource "mongodbatlas_database_user" "app" {
  project_id         = var.atlas_project_id
  username           = var.atlas_database_username
  password           = random_password.mongo_db_user.result
  auth_database_name = "admin"

  roles {
    role_name     = "readWrite"
    database_name = var.mongodb_database_name
  }
}
