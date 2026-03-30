.PHONY: install-deps start stop

install-deps:
	@echo "Installing Prerequisites (Helm repos)..."
	helm repo add kedacore https://kedacore.github.io/charts
	helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
	helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
	helm repo add grafana https://grafana.github.io/helm-charts
	helm repo update
	@echo "Dependencies repos added successfully. Please start Minikube or Kubernetes cluster."

start:
	@echo "Starting The Watcher locally via Docker Compose..."
	cd services/irctc && docker-compose up --build -d

stop:
	@echo "Stopping The Watcher..."
	cd services/irctc && docker-compose down
