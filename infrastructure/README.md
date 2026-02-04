# AWS Infrastructure Deployment

This directory contains CloudFormation templates for deploying the AWS infrastructure required by Anchor.band.

## Prerequisites

- AWS CLI installed and configured
- AWS account with appropriate IAM permissions
- IAM user or role with permissions to create:
  - DynamoDB tables
  - KMS keys
  - CloudFormation stacks

## Deployment

### 1. Deploy DynamoDB Table

Create the DynamoDB table for authentication data:

```bash
aws cloudformation create-stack \
  --stack-name anchor-auth-table \
  --template-body file://infrastructure/dynamodb-table.json \
  --parameters ParameterKey=TableName,ParameterValue=anchor-auth
```

Wait for the stack to complete:

```bash
aws cloudformation wait stack-create-complete \
  --stack-name anchor-auth-table
```

Retrieve the table name:

```bash
aws cloudformation describe-stacks \
  --stack-name anchor-auth-table \
  --query 'Stacks[0].Outputs[?OutputKey==`TableName`].OutputValue' \
  --output text
```

### 2. Deploy KMS Encryption Key

Create the KMS key for Spotify token encryption:

```bash
aws cloudformation create-stack \
  --stack-name anchor-kms-key \
  --template-body file://infrastructure/kms-key.json
```

Wait for the stack to complete:

```bash
aws cloudformation wait stack-create-complete \
  --stack-name anchor-kms-key
```

Retrieve the key ID:

```bash
aws cloudformation describe-stacks \
  --stack-name anchor-kms-key \
  --query 'Stacks[0].Outputs[?OutputKey==`KeyId`].OutputValue' \
  --output text
```

## Environment Variables

After deployment, set these environment variables in your `.env.local` file:

```bash
# From DynamoDB stack outputs
AUTH_DYNAMODB_REGION=us-east-1  # Your AWS region
# AUTH_DYNAMODB_ID and AUTH_DYNAMODB_SECRET from IAM user credentials

# From KMS stack outputs
KMS_KEY_ID=<key-id-from-output>
```

## Required IAM Policy

Your application's IAM user or role needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/anchor-auth",
        "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/anchor-auth/index/GSI1"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:REGION:ACCOUNT_ID:key/KEY_ID"
    }
  ]
}
```

Replace `REGION`, `ACCOUNT_ID`, and `KEY_ID` with your actual values.

## Creating IAM User

Create an IAM user with programmatic access:

```bash
aws iam create-user --user-name anchor-app
```

Attach the policy (save the policy above as `anchor-app-policy.json`):

```bash
aws iam put-user-policy \
  --user-name anchor-app \
  --policy-name AnchorAppPolicy \
  --policy-document file://anchor-app-policy.json
```

Create access keys:

```bash
aws iam create-access-key --user-name anchor-app
```

The output will contain `AccessKeyId` and `SecretAccessKey` - use these for `AUTH_DYNAMODB_ID` and `AUTH_DYNAMODB_SECRET`.

## Validation

Validate templates before deployment:

```bash
aws cloudformation validate-template \
  --template-body file://infrastructure/dynamodb-table.json

aws cloudformation validate-template \
  --template-body file://infrastructure/kms-key.json
```

## Cleanup

To delete the infrastructure:

```bash
# Delete KMS key stack
aws cloudformation delete-stack --stack-name anchor-kms-key

# Delete DynamoDB table stack
aws cloudformation delete-stack --stack-name anchor-auth-table
```

Note: The KMS key will be scheduled for deletion (default 30-day waiting period) and cannot be recovered after deletion.
