import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InvestoronboardingComponent } from './investoronboarding.component';

describe('InvestoronboardingComponent', () => {
  let component: InvestoronboardingComponent;
  let fixture: ComponentFixture<InvestoronboardingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ InvestoronboardingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InvestoronboardingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
