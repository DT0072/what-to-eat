import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Restaurant, INITIAL_FET_RESTAURANTS } from '../models/restaurant.model';

// Local storage key for persistent user additions
const STORAGE_KEY = 'sunway_fet_what_to_eat_restaurants_v3';
// Session storage key to keep track of logged in admin
const ADMIN_KEY = 'sunway_fet_admin_session';

// Admin credentials: Username and Password
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'fetadmin12345';

@Injectable({
  providedIn: 'root'
})
export class RestaurantService {
  // Observable list of restaurants so UI updates immediately when data changes
  private restaurants$ = new BehaviorSubject<Restaurant[]>([]);
  // Observable boolean indicating whether staff/admin mode is currently unlocked
  private isAdmin$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.initDatabase();
    this.checkAdminSession();
  }

  // Load saved restaurants from browser localStorage, or fall back to INITIAL_FET_RESTAURANTS in restaurant.model.ts
  private initDatabase(): void {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.restaurants$.next(parsed);
          return;
        }
      } catch (e) {
        console.error('Failed to parse saved restaurants', e);
      }
    }
    // First time load: save default list from restaurant.model.ts
    this.saveToStorage(INITIAL_FET_RESTAURANTS);
  }

  // Check if admin is already signed in for this browser tab session
  private checkAdminSession(): void {
    const session = sessionStorage.getItem(ADMIN_KEY);
    if (session === 'true') {
      this.isAdmin$.next(true);
    }
  }

  // Returns restaurant observable for components to subscribe
  getRestaurants(): Observable<Restaurant[]> {
    return this.restaurants$.asObservable();
  }

  // Returns current restaurant array snapshot
  getCurrentRestaurants(): Restaurant[] {
    return this.restaurants$.getValue();
  }

  // Returns admin login status observable
  getAdminStatus(): Observable<boolean> {
    return this.isAdmin$.asObservable();
  }

  // Check current admin status boolean
  isAdmin(): boolean {
    return this.isAdmin$.getValue();
  }

  // Verify staff admin username and password
  verifyAdmin(username: string, password: string): boolean {
    if (
      username.trim().toLowerCase() === ADMIN_USERNAME.toLowerCase() &&
      password.trim() === ADMIN_PASSWORD
    ) {
      this.isAdmin$.next(true);
      sessionStorage.setItem(ADMIN_KEY, 'true');
      return true;
    }
    return false;
  }

  // Log out of admin mode
  logoutAdmin(): void {
    this.isAdmin$.next(false);
    sessionStorage.removeItem(ADMIN_KEY);
  }

  // Add a new restaurant submitted by user and save to storage
  addRestaurant(restaurant: Omit<Restaurant, 'id' | 'createdAt'>): Restaurant {
    const current = this.getCurrentRestaurants();
    const newEntry: Restaurant = {
      ...restaurant,
      id: 'res-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString(),
      active: true
    };
    const updated = [newEntry, ...current];
    this.saveToStorage(updated);
    return newEntry;
  }

  // Export current full list as TypeScript code ready to copy-paste into restaurant.model.ts
  exportRestaurantsAsTsCode(): string {
    const current = this.getCurrentRestaurants();
    return `export const INITIAL_FET_RESTAURANTS: Restaurant[] = ${JSON.stringify(current, null, 2)};`;
  }

  // Download restaurants as a .ts file for developers to commit directly into source code
  downloadRestaurantsTsFile(): void {
    const tsCode = this.exportRestaurantsAsTsCode();
    const blob = new Blob([tsCode], { type: 'text/typescript;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'restaurant-data.ts';
    link.click();
    URL.revokeObjectURL(url);
  }

  // Delete a restaurant (restricted to admin only)
  deleteRestaurant(id: string): boolean {
    if (!this.isAdmin()) {
      throw new Error('Unauthorized: Only Admin can delete restaurant entries.');
    }
    const current = this.getCurrentRestaurants();
    const updated = current.filter(r => r.id !== id);
    this.saveToStorage(updated);
    return true;
  }

  // Toggle restaurant on/off in the spin wheel pool
  toggleActive(id: string): void {
    const current = this.getCurrentRestaurants();
    const updated = current.map(r => {
      if (r.id === id) {
        return { ...r, active: !r.active };
      }
      return r;
    });
    this.saveToStorage(updated);
  }

  // Reset database back to default initial list from restaurant.model.ts
  resetToDefault(): void {
    if (!this.isAdmin()) {
      throw new Error('Unauthorized: Only Admin can reset directory data.');
    }
    this.saveToStorage(INITIAL_FET_RESTAURANTS);
  }

  // Save list to localStorage and push update to subscribers
  private saveToStorage(list: Restaurant[]): void {
    this.restaurants$.next(list);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Storage error', e);
    }
  }

  // Get fair random integer index using crypto.getRandomValues
  getRandomIndex(length: number): number {
    if (length <= 0) return -1;
    if (window.crypto && window.crypto.getRandomValues) {
      const buffer = new Uint32Array(1);
      window.crypto.getRandomValues(buffer);
      return Math.floor((buffer[0] / 0x100000000) * length);
    }
    return Math.floor(Math.random() * length);
  }
}
