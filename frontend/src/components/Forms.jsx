import { Input, Select, Textarea, Button } from "./UI";
import { LocationPicker } from "./LocationPicker";

export function DynamicForm({ fields, values, lookups, onChange, onSubmit, submitLabel = "Simpan" }) {
  return (
    <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={onSubmit}>
      {fields.map((field) => {
        const value = values[field.name] ?? "";
        const common = { value, onChange: (e) => onChange(field.name, e.target.value), placeholder: field.placeholder || "" };

        if (field.type === "textarea") {
          return <div className={field.full ? "md:col-span-2" : ""} key={field.name}><Textarea label={field.label} {...common} /></div>;
        }

        if (field.type === "select") {
          const options = typeof field.options === "function" ? field.options(lookups, values) : field.options;
          return (
            <div key={field.name} className={field.full ? "md:col-span-2" : ""}>
              <Select label={field.label} {...common}>
                <option value="">Pilih {field.label}</option>
                {options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
            </div>
          );
        }

        if (field.type === "map-picker") {
          return (
            <div key={field.name} className={field.full ? "md:col-span-2" : ""}>
              <LocationPicker
                label={field.label}
                lookups={lookups}
                values={values}
                latField={field.latField}
                lngField={field.lngField}
                regencyField={field.regencyField || "regencyCode"}
                districtField={field.districtField || "districtCode"}
                onChange={onChange}
                height={field.height}
              />
            </div>
          );
        }

        return <div key={field.name} className={field.full ? "md:col-span-2" : ""}><Input label={field.label} type={field.type || "text"} {...common} /></div>;
      })}
      <div className="md:col-span-2 flex justify-end"><Button type="submit">{submitLabel}</Button></div>
    </form>
  );
}
