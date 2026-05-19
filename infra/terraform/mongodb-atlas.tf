locals {
  backend_mongodb_uri = "mongodb+srv://${urlencode(var.atlas_database_username)}:${urlencode(var.atlas_database_password)}@${var.mongodb_atlas_srv_host}/${var.mongodb_database_name}?retryWrites=true&w=majority&authSource=admin&appName=${urlencode(var.mongodb_atlas_app_name)}"
}

resource "mongodbatlas_database_user" "backend" {
  project_id         = var.atlas_project_id
  username           = var.atlas_database_username
  password           = var.atlas_database_password
  auth_database_name = "admin"

  roles {
    role_name     = "readWrite"
    database_name = var.mongodb_database_name
  }

  labels {
    key   = "project"
    value = var.project_name
  }

  labels {
    key   = "environment"
    value = var.environment
  }
}

resource "mongodbatlas_project_ip_access_list" "eks_nat_gateway" {
  project_id = var.atlas_project_id
  ip_address = aws_eip.nat.public_ip
  comment    = "Allow ${local.name_prefix} EKS backend through NAT Gateway"
}