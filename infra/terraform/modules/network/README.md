# module: network

VPC networking for the ITAssetPulse stacks. Instantiated once by `foundation`. Spec: §5.1.

## What it creates

- `aws_vpc` — `enable_dns_support` / `enable_dns_hostnames` enabled (required for private DNS resolution of
  AWS service endpoints such as ECR and CloudWatch Logs from the public subnets).
- `aws_internet_gateway`, attached to the VPC.
- `aws_subnet` (public) — one per entry in `public_subnet_cidrs`, `map_public_ip_on_launch = true`, spread
  across `availability_zone_count` AZs via `data "aws_availability_zones"`.
- `aws_subnet` (private) — one per entry in `private_subnet_cidrs`, same AZ spread, no public IP assignment.
- `aws_route_table` (public) with a `0.0.0.0/0 → aws_internet_gateway` route, plus associations for every
  public subnet.
- `aws_route_table` (private) with **no default route** — local-only — plus associations for every private
  subnet. It exists purely as the stable attachment point for a future NAT Gateway route; adding NAT later is
  a route addition, not a module restructure.

**No NAT Gateway, Elastic IP, or VPC endpoint in v1, and no `enable_nat_*` toggle** (NAT is added in a
dedicated later change when private-subnet compute is actually built).

## Inputs / outputs

- Inputs: `project_name`, `environment`, `common_tags`, `vpc_cidr`, `public_subnet_cidrs`,
  `private_subnet_cidrs`, `availability_zone_count`. `public_subnet_cidrs` and `private_subnet_cidrs` must each
  have exactly `availability_zone_count` entries (enforced via variable validation).
- Outputs: `vpc_id`, `vpc_cidr`, `public_subnet_ids`, `private_subnet_ids`. Subnet ID lists preserve the order
  of the corresponding input CIDR lists, so callers can reference them positionally and stably.

Implemented in: **#174**.
