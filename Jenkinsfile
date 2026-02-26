pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  parameters {
    booleanParam(name: 'DEPLOY_TO_K8S', defaultValue: true, description: 'Deploy to Kubernetes after building image')
    string(name: 'K8S_NAMESPACE', defaultValue: 'mern', description: 'Kubernetes namespace')
    string(name: 'IMAGE_NAME', defaultValue: 'mern-app', description: 'Docker image name')
    string(name: 'IMAGE_TAG', defaultValue: '', description: 'Optional image tag override (default: build number)')
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
        bat 'npm ci'
      }
    }

    stage('Install Frontend Dependencies') {
      steps {
        dir('frontend') {
          bat 'npm ci'
        }
      }
    }

    stage('Build Frontend') {
      steps {
        dir('frontend') {
          bat 'npm run build'
        }
      }
    }

    stage('Build Docker Image') {
      steps {
        script {
          def effectiveTag = params.IMAGE_TAG?.trim() ? params.IMAGE_TAG.trim() : "${env.BUILD_NUMBER}"
          env.EFFECTIVE_IMAGE = "${params.IMAGE_NAME}:${effectiveTag}"
        }
        bat "docker build -t ${env.EFFECTIVE_IMAGE} ."
      }
    }

    stage('Deploy to Kubernetes') {
      when {
        expression { return params.DEPLOY_TO_K8S }
      }
      steps {
        bat 'kubectl apply -k k8s'
        bat "kubectl set image deployment/mern-app mern-app=${env.EFFECTIVE_IMAGE} -n ${params.K8S_NAMESPACE}"
        bat "kubectl rollout status deployment/mern-app -n ${params.K8S_NAMESPACE} --timeout=120s"
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
