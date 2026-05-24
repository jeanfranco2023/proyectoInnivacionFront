import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarToggleService {
  private mobileSidebarOpenSubject = new BehaviorSubject<boolean>(false);
  mobileSidebarOpen$ = this.mobileSidebarOpenSubject.asObservable();

  toggle() {
    this.mobileSidebarOpenSubject.next(!this.mobileSidebarOpenSubject.value);
  }

  setOpen(open: boolean) {
    this.mobileSidebarOpenSubject.next(open);
  }

  isOpen(): boolean {
    return this.mobileSidebarOpenSubject.value;
  }
}
