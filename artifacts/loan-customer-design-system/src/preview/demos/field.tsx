import { useState } from 'react';
import { Card } from '../../components/ui/card';
import {
  Field,
  FieldInput,
  FieldSelect,
} from '../../components/ui/field';

export function FieldDemo() {
  const [city, setCity] = useState('');

  return (
    <Card className="max-w-2xl space-y-6 p-6 md:p-8">
      <div>
        <h2 className="font-serif text-3xl text-primary">A few details, please</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Clear labels sit above each control; helper text stays close to the
          field it explains.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Monthly income (₹)" htmlFor="demo-income">
          <FieldInput id="demo-income" type="number" min="1" placeholder="85,000" />
        </Field>
        <Field label="City" htmlFor="demo-city" hint="Used for application context.">
          <FieldInput
            id="demo-city"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Your city"
          />
        </Field>
        <Field label="Loan type" htmlFor="demo-loan-type" className="sm:col-span-2">
          <FieldSelect id="demo-loan-type" defaultValue="personal">
            <option value="personal">Personal loan</option>
            <option value="home">Home loan</option>
            <option value="business">Business loan</option>
          </FieldSelect>
        </Field>
      </div>
    </Card>
  );
}