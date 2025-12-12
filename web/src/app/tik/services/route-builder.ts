export function buildUrl (localUrl: string, routerPath?: string): string {
    if (routerPath !== '/') {
      return `${routerPath}/${localUrl}`
    }
    return localUrl
}

export function changeLastUrlSegment(routerUrl: string, lastSegment: string): string {
    
    const segments = routerUrl.split('/');

    segments[segments.length - 1] = lastSegment;

    return segments.join('/');
  }