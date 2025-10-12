terraform {
  required_version = ">= 1.5.0"

  backend "s3" {
    bucket         = "idea-bridge-prod-tf-state"
    key            = "idea-bridge-prod.tfstate"
    region         = "ap-northeast-1"
    encrypt        = true
    use_lockfile   = true
  }
}
