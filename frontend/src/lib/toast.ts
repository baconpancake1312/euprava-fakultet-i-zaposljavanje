export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
}

class ToastManager {
  private toasts: Toast[] = [];
  private container: HTMLElement | null = null;

  constructor() {
    this.createContainer();
  }

  private createContainer() {
    if (typeof document === 'undefined') return;
    
    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    this.container.className = 'fixed top-4 right-4 z-50 space-y-2';
    document.body.appendChild(this.container);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private getToastStyles(type: Toast['type']) {
    const baseStyles = 'p-4 rounded-lg shadow-lg border max-w-sm w-full transform transition-all duration-300 ease-in-out';
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-50 border-green-200 text-green-800`;
      case 'error':
        return `${baseStyles} bg-red-50 border-red-200 text-red-800`;
      case 'warning':
        return `${baseStyles} bg-yellow-50 border-yellow-200 text-yellow-800`;
      case 'info':
        return `${baseStyles} bg-blue-50 border-blue-200 text-blue-800`;
      default:
        return `${baseStyles} bg-gray-50 border-gray-200 text-gray-800`;
    }
  }

  private getIcon(type: Toast['type']) {
    switch (type) {
      case 'success':
        return `<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>`;
      case 'error':
        return `<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>`;
      case 'warning':
        return `<svg class="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
        </svg>`;
      case 'info':
        return `<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>`;
      default:
        return '';
    }
  }

  show(toast: Omit<Toast, 'id'>) {
    if (typeof document === 'undefined') return;

    const id = this.generateId();
    const newToast: Toast = { ...toast, id };
    this.toasts.push(newToast);

    this.render();
    this.autoRemove(id, toast.duration || 5000);
  }

  private render() {
    if (!this.container) return;

    this.container.innerHTML = this.toasts.map(toast => `
      <div id="toast-${toast.id}" class="${this.getToastStyles(toast.type)} opacity-0 translate-x-full">
        <div class="flex items-start">
          <div class="flex-shrink-0 mr-3">
            ${this.getIcon(toast.type)}
          </div>
          <div class="flex-1">
            <h4 class="font-semibold text-sm">${toast.title}</h4>
            <p class="text-sm mt-1">${toast.message}</p>
          </div>
          <button 
            onclick="toastManager.remove('${toast.id}')"
            class="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-600"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    `).join('');

    setTimeout(() => {
      this.toasts.forEach(toast => {
        const element = document.getElementById(`toast-${toast.id}`);
        if (element) {
          element.classList.remove('opacity-0', 'translate-x-full');
          element.classList.add('opacity-100', 'translate-x-0');
        }
      });
    }, 100);
  }

  remove(id: string) {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
    this.render();
  }

  private autoRemove(id: string, duration: number) {
    setTimeout(() => {
      this.remove(id);
    }, duration);
  }

  success(title: string, message: string, duration?: number) {
    this.show({ type: 'success', title, message, duration });
  }

  error(title: string, message: string, duration?: number) {
    this.show({ type: 'error', title, message, duration });
  }

  warning(title: string, message: string, duration?: number) {
    this.show({ type: 'warning', title, message, duration });
  }

  info(title: string, message: string, duration?: number) {
    this.show({ type: 'info', title, message, duration });
  }
}

export const toastManager = new ToastManager();

if (typeof window !== 'undefined') {
  (window as any).toastManager = toastManager;
}
