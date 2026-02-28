pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  parameters {
    booleanParam(name: 'DEPLOY_TO_RENDER', defaultValue: false, description: 'Trigger Render deploy after successful build')
    password(name: 'RENDER_DEPLOY_HOOK_URL', defaultValue: '', description: 'Optional Render deploy hook URL')
  }

  environment {
    NODE_ENV = 'production'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install Backend Dependencies') {
      steps {
        script {
          if (isUnix()) {
            sh 'npm ci'
          } else {
            bat 'npm ci'
          }
        }
      }
    }

    stage('Install Frontend Dependencies') {
      steps {
        dir('frontend') {
          script {
            if (isUnix()) {
              sh 'npm ci'
            } else {
              bat 'npm ci'
            }
          }
        }
      }
    }

    stage('Build Frontend') {
      steps {
        dir('frontend') {
          script {
            if (isUnix()) {
              sh 'npm run build'
            } else {
              bat 'npm run build'
            }
          }
        }
      }
    }

    stage('Build Docker Image') {
      steps {
        script {
          env.EFFECTIVE_IMAGE = "mern-app:${env.BUILD_NUMBER}"
          if (isUnix()) {
            sh "docker build -t ${env.EFFECTIVE_IMAGE} ."
          } else {
            bat "docker build -t ${env.EFFECTIVE_IMAGE} ."
          }
        }
      }
    }

    stage('Trigger Render Deploy') {
      when {
        expression { return params.DEPLOY_TO_RENDER }
      }
      steps {
        script {
          if (!params.RENDER_DEPLOY_HOOK_URL?.trim()) {
            error('RENDER_DEPLOY_HOOK_URL is required when DEPLOY_TO_RENDER=true')
          }

          if (isUnix()) {
            sh 'curl -fsS -X POST "$RENDER_DEPLOY_HOOK_URL"'
          } else {
            powershell 'Invoke-WebRequest -Method POST -Uri $env:RENDER_DEPLOY_HOOK_URL | Out-Null'
          }

          echo 'Render deploy triggered successfully.'
        }
      }
    }
  }

  post {
    success {
      echo "Pipeline succeeded. Built image: ${env.EFFECTIVE_IMAGE ?: 'not-set'}"
    }
    failure {
      echo 'Pipeline failed. Check build logs for details.'
    }
    always {
      archiveArtifacts artifacts: 'frontend/build/**', allowEmptyArchive: true
    }
  }
}
