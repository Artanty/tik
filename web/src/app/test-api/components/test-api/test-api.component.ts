import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';

/**
 * Для тестирования аутентификации с помощью кукис
 */
@Component({
  selector: 'app-test-api',
  // standalone: true,
  // imports: [],
  templateUrl: './test-api.component.html',
  styleUrl: './test-api.component.scss'
})
export class TestApiComponent {
  cookies: any = {};
  localStorage: any = {};
  apiResponse: any = null;

  urlBase = `${process.env['AU_BACK_URL']}/auth-cookies`

  constructor(private http: HttpClient) {
    this.updateCookiesAndLocalStorage();
  }

  // Update cookies and local storage
  updateCookiesAndLocalStorage() {
    console.log(JSON.stringify(document.cookie));

    // this.cookies = document.cookie
    //   .split(';')
    //   .reduce((acc, cookie) => {
    //     const [key, value] = cookie.trim().split('=');
    //     acc[key] = value;
    //     return acc;
    //   }, {} as { [key: string]: string });

    // this.localStorage = { ...localStorage };
  }

  // Register 
  
  register() {
    const user = { username: 'john', password: 'password123' };
    this.http.post(`${this.urlBase}/register`, user).subscribe(
      (response) => {
        this.apiResponse = response;
        this.updateCookiesAndLocalStorage();
      },
      (error) => {
        this.apiResponse = error.error;
      },
    );
  }

  // Login
  login() {
    const user = { username: 'john', password: 'password123' };
    this.http.post(`${this.urlBase}/login`, user, { withCredentials: true }).subscribe(
      (response) => {
        this.apiResponse = response;
        // this.updateCookiesAndLocalStorage();
      },
      (error) => {
        this.apiResponse = error.error;
      },
    );
  }

  // Logout
  logout() {
    this.http.post(`${this.urlBase}/logout`, {}, { withCredentials: true }).subscribe(
      (response) => {
        this.apiResponse = response;
        // this.updateCookiesAndLocalStorage();
      },
      (error) => {
        this.apiResponse = error.error;
      },
    );
  }

  // Get Profile (Protected Route)
  getProfile() {
    this.http.get(`${this.urlBase}/profile`, { withCredentials: true }).subscribe(
      (response) => {
        this.apiResponse = response;
      },
      (error) => {
        this.apiResponse = error.error;
      },
    );
  }
}
