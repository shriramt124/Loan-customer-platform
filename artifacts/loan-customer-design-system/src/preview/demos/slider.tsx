import { useState } from 'react';
import { Card } from '../../components/ui/card';
import { Slider } from '../../components/ui/slider';

const currency = (value: number) =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)}`;

export function SliderDemo() {
  const [amount, setAmount] = useState(1000000);
  const [rate, setRate] = useState(12.5);

  return (
    <Card className="max-w-2xl space-y-8 p-6 md:p-8">
      <div>
        <h2 className="font-serif text-3xl text-primary">Tune your estimate</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Values update immediately. The limit labels keep the range visible.
        </p>
      </div>
      <Slider
        label="Loan amount"
        value={amount}
        min={50000}
        max={5000000}
        step={25000}
        display={currency(amount)}
        onChange={setAmount}
        testid="preview-loan-amount"
      />
      <Slider
        label="Interest rate (per year)"
        value={rate}
        min={6}
        max={30}
        step={0.25}
        display={`${rate.toFixed(2)}%`}
        onChange={setRate}
        testid="preview-interest-rate"
      />
    </Card>
  );
}