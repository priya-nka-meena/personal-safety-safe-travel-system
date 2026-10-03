import React from "react";

const RoleSelect = ({ value, onChange, disabled = false }) => {
  const roles = [
    { value: "STUDENT", label: "Student" },
    { value: "PARENT", label: "Parent/Guardian" },
  ];

  return (
    <select
      className="form-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      required
    >
      {roles.map((role) => (
        <option key={role.value} value={role.value}>
          {role.label}
        </option>
      ))}
    </select>
  );
};

export default RoleSelect;

