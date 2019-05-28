manageronboardingimport { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageronboardingComponent } from './manageronboarding.component';

describe('ManageronboardingComponent', () => {
  let component: ManageronboardingComponent;
  let fixture: ComponentFixture<ManageronboardingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ManageronboardingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ManageronboardingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
