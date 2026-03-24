// Dynamic port configuration for frontend
window.BACKEND_CONFIG = {
  port: window.location.port || '3000',
  host: window.location.hostname || 'localhost',
  protocol: window.location.protocol || 'http:',
  get url() {
    return `${this.protocol}//${this.host}:${this.port}`;
  }
};

console.log('🔧 Backend config:', window.BACKEND_CONFIG.url);
