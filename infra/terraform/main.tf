locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${local.name_prefix}-vpc"
  }
}

resource "aws_subnet" "public" {
  count = length(var.public_subnet_cidrs)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${local.name_prefix}-public-subnet-${count.index + 1}"
    Type = "public"
  }
}

resource "aws_subnet" "private" {
  count = length(var.private_subnet_cidrs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "${local.name_prefix}-private-subnet-${count.index + 1}"
    Type = "private"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${local.name_prefix}-igw"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${local.name_prefix}-public-rt"
  }
}

resource "aws_route" "public_internet_access" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main.id
}

resource "aws_route_table_association" "public" {
  count = length(aws_subnet.public)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name = "${local.name_prefix}-nat-eip"
  }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "${local.name_prefix}-nat"
  }
  depends_on = [aws_internet_gateway.main]
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${local.name_prefix}-private-rt"
    Type = "private"
  }
}

resource "aws_route" "private_nat_access" {
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main.id
}

resource "aws_route_table_association" "private" {
  count = length(aws_subnet.private)

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# -----------------------------------------------------------------------------
# ECR repositories
# -----------------------------------------------------------------------------

resource "aws_ecr_repository" "backend" {
  name                 = "${local.name_prefix}-backend-ecr"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "frontend" {
  name                 = "${local.name_prefix}-frontend-ecr"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep only the last 10 backend images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

resource "aws_ecr_lifecycle_policy" "frontend" {
  repository = aws_ecr_repository.frontend.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep only the last 10 frontend images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# ---------------------- EKS Cluster --------------------------------------------------------

resource "aws_iam_role" "eks_cluster" {
  name = "${local.name_prefix}-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
  tags = {
    Name = "${local.name_prefix}-eks-cluster-role"
  }
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  role       = aws_iam_role.eks_cluster.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

resource "aws_eks_cluster" "main" {
  name     = "${local.name_prefix}-eks"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = var.eks_cluster_version

  vpc_config {
    subnet_ids = concat(
      aws_subnet.public[*].id,
      aws_subnet.private[*].id
    )
  }
  depends_on = [aws_iam_role_policy_attachment.eks_cluster_policy]

  tags = {
    Name = "${local.name_prefix}-eks"
  }
}

# ---------------------- EKS Managed Node Group --------------------------------------------------------

resource "aws_iam_role" "eks_node_group" {
  name = "${local.name_prefix}-eks-node-group-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name = "${local.name_prefix}-eks-node-group-role"
  }
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  role       = aws_iam_role.eks_node_group.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  role       = aws_iam_role.eks_node_group.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}

resource "aws_iam_role_policy_attachment" "eks_ecr_pull_policy" {
  role       = aws_iam_role.eks_node_group.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPullOnly"
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${local.name_prefix}-node-group"
  node_role_arn   = aws_iam_role.eks_node_group.arn
  subnet_ids      = aws_subnet.private[*].id

  instance_types = var.eks_node_instance_types
  capacity_type  = "ON_DEMAND"

  scaling_config {
    desired_size = var.eks_node_desired_size
    min_size     = var.eks_node_min_size
    max_size     = var.eks_node_max_size
  }

  update_config {
    max_unavailable = 1
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_ecr_pull_policy
  ]

  tags = {
    Name = "${local.name_prefix}-node-group"
  }
}

# ---------------------- EKS Addons --------------------------------------------------------

resource "aws_eks_addon" "vpc_cni" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "vpc-cni"

  depends_on = [
    aws_eks_node_group.main
  ]

  tags = {
    Name = "${local.name_prefix}-vpc-cni-addon"
  }
}

resource "aws_eks_addon" "kube_proxy" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "kube-proxy"

  depends_on = [
    aws_eks_node_group.main
  ]

  tags = {
    Name = "${local.name_prefix}-kube-proxy-addon"
  }
}

resource "aws_eks_addon" "coredns" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "coredns"

  depends_on = [
    aws_eks_node_group.main
  ]

  tags = {
    Name = "${local.name_prefix}-coredns-addon"
  }
}

resource "aws_eks_addon" "pod_identity_agent" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "eks-pod-identity-agent"

  depends_on = [
    aws_eks_node_group.main
  ]

  tags = {
    Name = "${local.name_prefix}-pod-identity-agent-addon"
  }
}

# ---------------------- EBS CSI Driver Addon --------------------------------------------------------

resource "aws_iam_role" "ebs_csi_driver" {
  name = "${local.name_prefix}-ebs-csi-driver-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "pods.eks.amazonaws.com"
        }
        Action = [
          "sts:AssumeRole",
          "sts:TagSession"
        ]
      }
    ]
  })

  tags = {
    Name = "${local.name_prefix}-ebs-csi-driver-role"
  }
}

resource "aws_iam_role_policy_attachment" "ebs_csi_driver_policy" {
  role       = aws_iam_role.ebs_csi_driver.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
}

resource "aws_eks_addon" "ebs_csi_driver" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "aws-ebs-csi-driver"

  pod_identity_association {
    role_arn        = aws_iam_role.ebs_csi_driver.arn
    service_account = "ebs-csi-controller-sa"
  }

  depends_on = [
    aws_eks_node_group.main,
    aws_eks_addon.pod_identity_agent,
    aws_iam_role_policy_attachment.ebs_csi_driver_policy
  ]

  tags = {
    Name = "${local.name_prefix}-ebs-csi-driver-addon"
  }
}

# ---------------------- AWS Load Balancer Controller --------------------------------------------------------

resource "aws_iam_policy" "load_balancer_controller" {
  name        = "${local.name_prefix}-aws-load-balancer-controller-policy"
  description = "IAM policy for AWS Load Balancer Controller"
  policy      = file("${path.module}/aws-load-balancer-controller-iam-policy.json")

  tags = {
    Name = "${local.name_prefix}-aws-load-balancer-controller-policy"
  }
}

resource "aws_iam_role" "load_balancer_controller" {
  name = "${local.name_prefix}-aws-load-balancer-controller-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "pods.eks.amazonaws.com"
        }
        Action = [
          "sts:AssumeRole",
          "sts:TagSession"
        ]
      }
    ]
  })

  tags = {
    Name = "${local.name_prefix}-aws-load-balancer-controller-role"
  }
}

resource "aws_iam_role_policy_attachment" "load_balancer_controller" {
  role       = aws_iam_role.load_balancer_controller.name
  policy_arn = aws_iam_policy.load_balancer_controller.arn
}

resource "aws_eks_pod_identity_association" "load_balancer_controller" {
  cluster_name    = aws_eks_cluster.main.name
  namespace       = "kube-system"
  service_account = "aws-load-balancer-controller"
  role_arn        = aws_iam_role.load_balancer_controller.arn

  depends_on = [
    aws_eks_addon.pod_identity_agent,
    aws_iam_role_policy_attachment.load_balancer_controller
  ]

  tags = {
    Name = "${local.name_prefix}-aws-load-balancer-controller-pod-identity"
  }
}

resource "helm_release" "load_balancer_controller" {
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  namespace  = "kube-system"
  version    = "1.14.0"

  set = [
    {
      name  = "clusterName"
      value = aws_eks_cluster.main.name
    },
    {
      name  = "region"
      value = var.aws_region
    },
    {
      name  = "vpcId"
      value = aws_vpc.main.id
    },
    {
      name  = "serviceAccount.create"
      value = "true"
    },
    {
      name  = "serviceAccount.name"
      value = "aws-load-balancer-controller"
    }
  ]

  depends_on = [
    aws_eks_pod_identity_association.load_balancer_controller
  ]
}

# ---------------------- Kubernetes Namespace and Base Config --------------------------------------------------------

resource "kubernetes_namespace" "itassetpulse" {
  metadata {
    name = var.kubernetes_namespace

    labels = {
      app         = var.project_name
      environment = var.environment
      managed-by  = "terraform"
    }
  }
}

resource "kubernetes_config_map" "app_config" {
  metadata {
    name      = "${var.project_name}-config"
    namespace = kubernetes_namespace.itassetpulse.metadata[0].name

    labels = {
      app         = var.project_name
      environment = var.environment
      managed-by  = "terraform"
    }
  }

  data = {
    APP_ENV    = var.environment
    AWS_REGION = var.aws_region
  }
}

# ---------------------- Kubernetes Application Secrets --------------------------------------------------------

resource "kubernetes_secret" "backend" {
  metadata {
    name      = "${var.project_name}-backend-secret"
    namespace = kubernetes_namespace.itassetpulse.metadata[0].name

    labels = {
      app         = var.project_name
      component   = "backend"
      environment = var.environment
      managed-by  = "terraform"
    }
  }

  data = {
    MONGO_URI  = var.mongodb_uri
    JWT_SECRET = var.jwt_secret
  }

  type = "Opaque"
}

# ---------------------- Backend Application Deployment --------------------------------------------------------

resource "kubernetes_deployment" "backend" {
  metadata {
    name      = "${var.project_name}-backend"
    namespace = kubernetes_namespace.itassetpulse.metadata[0].name

    labels = {
      app         = var.project_name
      component   = "backend"
      environment = var.environment
      managed-by  = "terraform"
    }
  }

  spec {
    replicas = 1

    strategy {
      type = "Recreate"
    }

    selector {
      match_labels = {
        app       = var.project_name
        component = "backend"
      }
    }

    template {
      metadata {
        labels = {
          app         = var.project_name
          component   = "backend"
          environment = var.environment
        }
      }

      spec {
        container {
          name  = "backend"
          image = "${aws_ecr_repository.backend.repository_url}:${var.image_tag}"

          port {
            container_port = 3000
          }

          env {
            name  = "NODE_ENV"
            value = "production"
          }

          env {
            name  = "PORT"
            value = "3000"
          }

          env {
            name = "APP_ENV"

            value_from {
              config_map_key_ref {
                name = kubernetes_config_map.app_config.metadata[0].name
                key  = "APP_ENV"
              }
            }
          }

          env {
            name = "AWS_REGION"

            value_from {
              config_map_key_ref {
                name = kubernetes_config_map.app_config.metadata[0].name
                key  = "AWS_REGION"
              }
            }
          }

          env {
            name = "MONGO_URI"

            value_from {
              secret_key_ref {
                name = kubernetes_secret.backend.metadata[0].name
                key  = "MONGO_URI"
              }
            }
          }

          env {
            name = "JWT_SECRET"

            value_from {
              secret_key_ref {
                name = kubernetes_secret.backend.metadata[0].name
                key  = "JWT_SECRET"
              }
            }
          }

          readiness_probe {
            tcp_socket {
              port = 3000
            }

            initial_delay_seconds = 20
            period_seconds        = 10
          }

          liveness_probe {
            tcp_socket {
              port = 3000
            }

            initial_delay_seconds = 30
            period_seconds        = 20
          }
        }
      }
    }
  }
}

# ---------------------- Backend Application Service -----------------------------------------------------------

resource "kubernetes_service" "backend" {
  metadata {
    name      = "${var.project_name}-backend-service"
    namespace = kubernetes_namespace.itassetpulse.metadata[0].name

    labels = {
      app         = var.project_name
      component   = "backend"
      environment = var.environment
      managed-by  = "terraform"
    }
  }

  spec {
    type = "ClusterIP"

    selector = {
      app       = var.project_name
      component = "backend"
    }

    port {
      name        = "http"
      port        = 3000
      target_port = 3000
      protocol    = "TCP"
    }
  }
}

# ---------------------- Frontend Application Deployment -------------------------------------------------------

resource "kubernetes_deployment" "frontend" {
  metadata {
    name      = "${var.project_name}-frontend"
    namespace = kubernetes_namespace.itassetpulse.metadata[0].name

    labels = {
      app         = var.project_name
      component   = "frontend"
      environment = var.environment
      managed-by  = "terraform"
    }
  }

  spec {
    replicas = 1

    strategy {
      type = "Recreate"
    }

    selector {
      match_labels = {
        app       = var.project_name
        component = "frontend"
      }
    }

    template {
      metadata {
        labels = {
          app         = var.project_name
          component   = "frontend"
          environment = var.environment
        }
      }

      spec {
        container {
          name  = "frontend"
          image = "${aws_ecr_repository.frontend.repository_url}:${var.image_tag}"

          port {
            container_port = 80
          }

          readiness_probe {
            tcp_socket {
              port = 80
            }

            initial_delay_seconds = 10
            period_seconds        = 10
          }

          liveness_probe {
            tcp_socket {
              port = 80
            }

            initial_delay_seconds = 20
            period_seconds        = 20
          }
        }
      }
    }
  }
}

# ---------------------- Frontend Application Service ----------------------------------------------------------

resource "kubernetes_service" "frontend" {
  metadata {
    name      = "${var.project_name}-frontend-service"
    namespace = kubernetes_namespace.itassetpulse.metadata[0].name

    labels = {
      app         = var.project_name
      component   = "frontend"
      environment = var.environment
      managed-by  = "terraform"
    }
  }

  spec {
    type = "ClusterIP"

    selector = {
      app       = var.project_name
      component = "frontend"
    }

    port {
      name        = "http"
      port        = 80
      target_port = 80
      protocol    = "TCP"
    }
  }
}

# ---------------------- Application Ingress -------------------------------------------------------------------

resource "kubernetes_ingress_v1" "app" {
  metadata {
    name      = "${var.project_name}-ingress"
    namespace = kubernetes_namespace.itassetpulse.metadata[0].name

    labels = {
      app         = var.project_name
      environment = var.environment
      managed-by  = "terraform"
    }

    annotations = {
      "kubernetes.io/ingress.class"                = "alb"
      "alb.ingress.kubernetes.io/scheme"           = "internet-facing"
      "alb.ingress.kubernetes.io/target-type"      = "ip"
      "alb.ingress.kubernetes.io/listen-ports"     = jsonencode([{ HTTP = 80 }])
      "alb.ingress.kubernetes.io/healthcheck-path" = "/"
    }
  }

  spec {
    rule {
      http {
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = kubernetes_service.frontend.metadata[0].name

              port {
                number = 80
              }
            }
          }
        }
      }
    }
  }

  depends_on = [
    helm_release.load_balancer_controller,
    kubernetes_service.frontend
  ]
}