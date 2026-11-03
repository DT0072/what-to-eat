import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import confetti from 'canvas-confetti';
import { Restaurant } from '../models/restaurant.model';
import { RestaurantService } from '../services/restaurant.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit, AfterViewInit, OnDestroy {
  // Reference to HTML5 Canvas where wheel segments and text are drawn
  @ViewChild('wheelCanvas', { static: false }) wheelCanvasRef!: ElementRef<HTMLCanvasElement>;

  // Current selected tab ('wheel' | 'directory' | 'add')
  currentTab: 'wheel' | 'directory' | 'add' = 'wheel';

  // Restaurant lists
  restaurants: Restaurant[] = [];          // All restaurants in database
  filteredRestaurants: Restaurant[] = [];  // Filtered by search and halal status
  activeRestaurants: Restaurant[] = [];    // Checked items included in the wheel spin
  isAdmin = false;                         // Admin mode flag for delete privileges

  // Search input & Diet category filter
  searchQuery = '';
  selectedHalalFilter = 'ALL';

  // Spin wheel state & animation
  isSpinning = false;
  currentRotation = 0;                     // Angle in radians
  selectedWinner: Restaurant | null = null;
  private animFrameId: number | null = null;

  // Input model for adding a new restaurant
  newForm = {
    name: '',
    category: 'Rock Cafe / SS15' as Restaurant['category'],
    priceRange: '$' as Restaurant['priceRange'],
    approxPriceMYR: 'RM 10 - RM 15',
    walkingTimeMin: 5,
    halalStatus: 'Halal Certified' as Restaurant['halalStatus'],
    exactAddress: '',
    locationNote: '',
    recommendedDish: '',
    googleMapsPlaceQuery: '',
    addedBy: ''
  };

  // Distinct color palette for wheel segments (Sunway Navy, Gold, SET Teal, Maroon, etc.)
  private segmentPalette = [
    '#002B49', '#0A9396', '#E09F3E', '#005F73',
    '#9B2226', '#2A9D8F', '#CA6702', '#1D3557',
    '#457B9D', '#588157', '#3D5A80', '#BC6C25'
  ];

  private sub = new Subscription();

  constructor(
    private restaurantService: RestaurantService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  // Subscribe to restaurant updates and admin status on component mount
  ngOnInit() {
    this.sub.add(
      this.restaurantService.getRestaurants().subscribe(list => {
        this.restaurants = list;
        this.activeRestaurants = list.filter(r => r.active);
        this.applyFilter();
        setTimeout(() => this.drawWheel(), 50);
      })
    );

    this.sub.add(
      this.restaurantService.getAdminStatus().subscribe(status => {
        this.isAdmin = status;
      })
    );
  }

  // Redraw wheel when canvas element is ready in DOM
  ngAfterViewInit() {
    setTimeout(() => {
      this.drawWheel();
    }, 100);
  }

  // Clean up subscriptions and animation frames when navigating away
  ngOnDestroy() {
    this.sub.unsubscribe();
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  // Handle switching tabs
  onTabChange(event: any) {
    if (this.currentTab === 'wheel') {
      setTimeout(() => this.drawWheel(), 50);
    }
  }

  // Return segment slice color based on index
  getSegmentColor(index: number): string {
    return this.segmentPalette[index % this.segmentPalette.length];
  }

  // Return CSS badge class matching dietary preference
  getHalalBadgeClass(status: string): string {
    switch (status) {
      case 'Halal Certified': return 'badge-halal';
      case 'Pork-Free / Muslim-Friendly': return 'badge-muslim-friendly';
      case 'Non-Halal': return 'badge-non-halal';
      case 'Vegetarian': return 'badge-veg';
      default: return 'badge-muslim-friendly';
    }
  }

  // Toggle restaurant active status (included or excluded from spin wheel)
  onToggleRestaurant(item: Restaurant) {
    this.restaurantService.toggleActive(item.id);
  }

  // Filter directory list by search text and diet status
  applyFilter() {
    const q = this.searchQuery.trim().toLowerCase();
    this.filteredRestaurants = this.restaurants.filter(r => {
      const matchQuery = !q ||
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.locationNote.toLowerCase().includes(q) ||
        (r.exactAddress && r.exactAddress.toLowerCase().includes(q)) ||
        (r.recommendedDish && r.recommendedDish.toLowerCase().includes(q));

      const matchHalal = this.selectedHalalFilter === 'ALL' || r.halalStatus === this.selectedHalalFilter;
      return matchQuery && matchHalal;
    });
  }

  // Set dietary chip filter
  setHalalFilter(filter: string) {
    this.selectedHalalFilter = filter;
    this.applyFilter();
  }

  // Draw the spin wheel canvas slices, text labels, borders and rivets
  drawWheel() {
    if (!this.wheelCanvasRef || !this.wheelCanvasRef.nativeElement) return;
    const canvas = this.wheelCanvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = centerX - 12;

    ctx.clearRect(0, 0, width, height);

    const items = this.activeRestaurants;
    const total = items.length;

    if (total === 0) {
      ctx.fillStyle = '#64748B';
      ctx.textAlign = 'center';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('No restaurants selected in pool!', centerX, centerY);
      return;
    }

    const arc = (2 * Math.PI) / total;

    // Outer dark rim and border ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#001b2e';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 3, 0, 2 * Math.PI);
    ctx.strokeStyle = '#F5A623';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    // Draw individual slices
    for (let i = 0; i < total; i++) {
      const angle = this.currentRotation + i * arc;

      ctx.beginPath();
      ctx.fillStyle = this.getSegmentColor(i);
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, angle, angle + arc);
      ctx.lineTo(centerX, centerY);
      ctx.fill();

      // Divider between segments
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Restaurant name label
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = total > 12 ? 'bold 11px sans-serif' : 'bold 13px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      ctx.translate(centerX, centerY);
      ctx.rotate(angle + arc / 2);

      let text = items[i].name;
      if (text.length > 20) {
        text = text.substring(0, 18) + '...';
      }
      ctx.fillText(text, radius - 20, 0);

      ctx.restore();
    }

    // Outer perimeter rivets
    for (let i = 0; i < total * 2; i++) {
      const dotAngle = this.currentRotation + (i * Math.PI) / total;
      const dotX = centerX + (radius + 4) * Math.cos(dotAngle);
      const dotY = centerY + (radius + 4) * Math.sin(dotAngle);

      ctx.beginPath();
      ctx.arc(dotX, dotY, 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#F5A623';
      ctx.fill();
    }
  }

  // Spin the wheel using crypto-random index and smooth cubic easing
  spinWheel() {
    if (this.isSpinning) return;
    const items = this.activeRestaurants;
    if (items.length < 2) {
      this.presentToast('Please keep at least 2 active restaurants in the pool to spin!', 'warning');
      return;
    }

    this.isSpinning = true;
    this.selectedWinner = null;

    // Pick uniform random winner index
    const winnerIndex = this.restaurantService.getRandomIndex(items.length);
    const arc = (2 * Math.PI) / items.length;

    // Pointer is fixed at top: 270 degrees
    const pointerAngle = (3 * Math.PI) / 2;

    // Slight random offset inside the winning segment
    const jitterFactor = 0.15 + (this.restaurantService.getRandomIndex(1000) / 1000) * 0.7;
    const sliceInnerOffset = arc * jitterFactor;

    // Add 6 to 9 full spins for natural suspense
    const extraSpins = 6 + this.restaurantService.getRandomIndex(4);
    const targetAngleAtPointer = pointerAngle - (winnerIndex * arc + sliceInnerOffset);

    // Calculate rotation angle delta
    const twoPi = 2 * Math.PI;
    const normalizedTarget = ((targetAngleAtPointer % twoPi) + twoPi) % twoPi;
    const currentNorm = ((this.currentRotation % twoPi) + twoPi) % twoPi;
    let diff = normalizedTarget - currentNorm;
    if (diff < 0) diff += twoPi;

    const totalAngleToRotate = extraSpins * twoPi + diff;
    const startRotation = this.currentRotation;
    const durationMs = 4000 + this.restaurantService.getRandomIndex(800);
    const startTime = performance.now();

    // Animation loop with cubic deceleration
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      this.currentRotation = startRotation + totalAngleToRotate * ease;
      this.drawWheel();

      if (progress < 1) {
        this.animFrameId = requestAnimationFrame(animate);
      } else {
        // Run inside NgZone so Angular immediately updates the UI with winner
        this.ngZone.run(() => {
          this.isSpinning = false;
          this.selectedWinner = items[winnerIndex];
          this.cdr.detectChanges();
          this.triggerCelebration();
        });
      }
    };

    this.animFrameId = requestAnimationFrame(animate);
  }

  // Confetti effect when winner is selected
  private triggerCelebration() {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#002B49', '#F5A623', '#0A9396', '#ffffff']
      });
    } catch (e) {
      // Fallback
    }
  }

  // Open Google Maps directions using coordinates or place search query
  openGoogleMaps(restaurant: Restaurant | string) {
    let query: string;
    if (typeof restaurant === 'string') {
      query = encodeURIComponent(`${restaurant} Sunway University Bandar Sunway`);
    } else {
      if (restaurant.googleMapsCoordinates) {
        window.open(`https://www.google.com/maps/search/?api=1&query=${restaurant.googleMapsCoordinates.lat},${restaurant.googleMapsCoordinates.lng}`, '_blank');
        return;
      }
      query = encodeURIComponent(restaurant.googleMapsPlaceQuery || `${restaurant.name} ${restaurant.exactAddress || 'Sunway University'}`);
    }
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  }

  // Validate required form fields before saving
  isFormValid(): boolean {
    return !!(
      this.newForm.name.trim() &&
      this.newForm.locationNote.trim() &&
      this.newForm.addedBy.trim() &&
      this.newForm.walkingTimeMin > 0
    );
  }

  // Submit and save new restaurant from user input
  submitNewRestaurant() {
    if (!this.isFormValid()) return;

    const approx = this.newForm.approxPriceMYR.trim() || (
      this.newForm.priceRange === '$' ? 'RM 7 - RM 14' :
      this.newForm.priceRange === '$$' ? 'RM 15 - RM 25' : 'RM >25'
    );

    this.restaurantService.addRestaurant({
      name: this.newForm.name.trim(),
      category: this.newForm.category,
      priceRange: this.newForm.priceRange,
      approxPriceMYR: approx,
      walkingTimeMin: Number(this.newForm.walkingTimeMin),
      halalStatus: this.newForm.halalStatus,
      exactAddress: this.newForm.exactAddress.trim() || this.newForm.locationNote.trim(),
      locationNote: this.newForm.locationNote.trim(),
      googleMapsPlaceQuery: this.newForm.googleMapsPlaceQuery.trim() || `${this.newForm.name.trim()} Bandar Sunway`,
      recommendedDish: this.newForm.recommendedDish.trim() || undefined,
      addedBy: this.newForm.addedBy.trim(),
      active: true
    });

    this.presentToast(`"${this.newForm.name}" registered successfully! Added to Spin Wheel pool.`, 'success');

    // Reset form fields
    this.newForm = {
      name: '',
      category: 'Rock Cafe / SS15',
      priceRange: '$',
      approxPriceMYR: 'RM 10 - RM 15',
      walkingTimeMin: 5,
      halalStatus: 'Halal Certified',
      exactAddress: '',
      locationNote: '',
      recommendedDish: '',
      googleMapsPlaceQuery: '',
      addedBy: ''
    };

    // Switch tab to wheel so user can see it right away
    this.currentTab = 'wheel';
  }

  // Export & download restaurants as TypeScript code for developers
  downloadTsFile() {
    this.restaurantService.downloadRestaurantsTsFile();
    this.presentToast('Downloaded restaurant-data.ts with all current restaurants!', 'success');
  }

  // Open staff admin passcode prompt
  async openAdminLogin() {
    const alert = await this.alertCtrl.create({
      header: 'Staff / Admin Authentication',
      subHeader: 'Only authorized staff can delete restaurant entries.',
      message: 'Enter staff passcode (Default passcode: setadmin123)',
      inputs: [
        {
          name: 'passcode',
          type: 'password',
          placeholder: 'Enter Passcode'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Authenticate',
          handler: (data) => {
            if (this.restaurantService.verifyAdmin(data.passcode || '')) {
              this.presentToast('Staff privileges enabled! You can now delete records.', 'success');
              return true;
            } else {
              this.presentToast('Invalid passcode. Access denied.', 'danger');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // Sign out from admin mode
  logoutAdmin() {
    this.restaurantService.logoutAdmin();
    this.presentToast('Signed out from Admin Mode.', 'medium');
  }

  // Prompt confirmation to delete restaurant (admin only)
  async deleteRestaurant(item: Restaurant) {
    if (!this.isAdmin) {
      this.presentToast('Unauthorized! Only Admin can delete restaurant records.', 'danger');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Confirm Deletion',
      message: `Are you sure you want to delete <strong>${item.name}</strong> from database? This action cannot be undone.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.restaurantService.deleteRestaurant(item.id);
            this.presentToast(`"${item.name}" deleted from database.`, 'warning');
          }
        }
      ]
    });

    await alert.present();
  }

  // Reset database back to default initial list
  async confirmResetDefault() {
    if (!this.isAdmin) return;
    const alert = await this.alertCtrl.create({
      header: 'Reset to Default Directory',
      message: 'Restore all default Sunway campus eateries?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Reset',
          role: 'destructive',
          handler: () => {
            this.restaurantService.resetToDefault();
            this.presentToast('Database restored to default Sunway eateries.', 'success');
          }
        }
      ]
    });
    await alert.present();
  }

  // Display toast feedback notification
  private async presentToast(message: string, color: 'success' | 'warning' | 'danger' | 'medium' = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
