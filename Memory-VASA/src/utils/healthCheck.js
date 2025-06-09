export const checkBackendHealth = async () => {
  try {
    // Use relative path - Vite proxy will handle routing to backend
    const response = await fetch('/api/health');
    if (response.ok) {
      const data = await response.json();
      console.log('Backend health check passed:', data);
      return true;
    } else {
      console.error('Backend health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Backend health check error:', error);
    return false;
  }
};