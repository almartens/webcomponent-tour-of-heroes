let paramRe = /^:(.+)/;

function segmentize(uri) {
  return uri.replace(/(^\/+|\/+$)/g, '').split('/');
}

function match(routes, uri) {
  let match;
  const [uriPathname] = uri.split('?');
  const uriSegments = segmentize(uriPathname);
  const isRootUri = uriSegments[0] === '/';

  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    const routeSegments = segmentize(route.path);
    const max = Math.max(uriSegments.length, routeSegments.length);
    let index = 0;
    let missed = false;
    let params = {};
    for (; index < max; index++) {
      const uriSegment = uriSegments[index];
      const routeSegment = routeSegments[index];
      const fallback = routeSegment === '*';
      if (fallback) {
        params['*'] = uriSegments
          .slice(index)
          .map(decodeURIComponent)
          .join('/');
        break;
      }
      if (uriSegment === undefined) {
        missed = true;
        break;
      }
      let dynamicMatch = paramRe.exec(routeSegment);
      if (dynamicMatch && !isRootUri) {
        let value = decodeURIComponent(uriSegment);
        params[dynamicMatch[1]] = value;
      } else if (routeSegment !== uriSegment) {
        missed = true;
        break;
      }
    }
    if (!missed) {
      match = { params, ...route };
      break;
    }
  }

  return match || null;
}

const removeHash = val => val.slice(1);

function locationHashChanged() {
  const router = document.querySelector('h-router');
  router.navigate(removeHash(location.hash));
}

window.onhashchange = locationHashChanged;

export default class Router extends HTMLElement {
  navigate(url) {
    const matchedRoute = match(this.routes, url);
    if (!matchedRoute) {
      this.activeRoute = this.routes[0];
      window.history.pushState(null, null, '/#' + this.activeRoute.path);
    } else {
      this.activeRoute = matchedRoute;
      window.history.pushState(null, null, '/#' + url);
    }

    this.update();
  }

  connectedCallback() {
    this.navigate(removeHash(location.hash));
  }

  get routes() {
    return Array.from(this.querySelectorAll('h-route'))
      .filter(node => node.parentNode === this)
      .map(r => ({
        path: r.getAttribute('path'),
        title: r.getAttribute('title'),
        component: r.getAttribute('component'),
      }));
  }

  get outlet() {
    return this.querySelector('h-router-outlet');
  }

  update() {
    const { component, title, params = {} } = this.activeRoute;
    if (component) {
      while (this.outlet.firstChild) {
        this.outlet.removeChild(this.outlet.firstChild);
      }
      const view = document.createElement(component);
      // If the the route has title attribute
      // update the document title with title attribute value
      document.title = title || document.title;
      // Pass the dynamica parameters as attribute
      // for newly created element
      for (let key in params) {
        if (key !== '*') view.setAttribute(key, params[key]);
      }
      this.outlet.appendChild(view);
    }
  }
}
customElements.define('h-router', Router);
