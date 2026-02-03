"use client";

import React from "react";
import { useAppState } from "@/hooks/useAppState";
import {
  SPORTS,
  SQUADS,
  SEGMENT_TYPES,
  TIMEZONES,
  US_STATES,
  ORGANIZATIONS,
  getDefaultSegmentType,
} from "@/lib/constants";
import Card from "@/components/ui/Card";
import Dropdown from "@/components/ui/Dropdown";
import Button from "@/components/ui/Button";

export default function ConfigureDefaults() {
  const { state, dispatch } = useAppState();
  const [customOrgId, setCustomOrgId] = React.useState<string>("");

  const handleSportChange = (sport: string) => {
    dispatch({
      type: "SET_DEFAULTS",
      defaults: {
        sport: sport as any,
        segmentType: getDefaultSegmentType(sport as any),
      },
    });
  };

  const handleOrgChange = (orgId: number) => {
    if (orgId === -1) {
      // "Other" selected, clear orgId until custom value entered
      dispatch({ type: "SET_DEFAULTS", defaults: { orgId: null } });
    } else {
      dispatch({ type: "SET_DEFAULTS", defaults: { orgId } });
      setCustomOrgId("");
    }
  };

  const handleCustomOrgIdChange = (value: string) => {
    setCustomOrgId(value);
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      dispatch({ type: "SET_DEFAULTS", defaults: { orgId: numValue } });
    }
  };

  const handleNext = () => {
    dispatch({ type: "SET_STEP", step: 3 });
  };

  const handleBack = () => {
    dispatch({ type: "SET_STEP", step: 1 });
  };

  const canProceed =
    state.defaults.sport &&
    state.defaults.squadId &&
    state.defaults.segmentType &&
    state.defaults.state &&
    state.defaults.orgId;

  return (
    <Card className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-light text-[var(--ss-text-light)] text-center mb-8">
        Configure Defaults
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Dropdown
          label="Sport"
          value={state.defaults.sport}
          onChange={handleSportChange}
          options={SPORTS.map((s) => ({ value: s.name, label: s.label }))}
          placeholder="Please select a sport"
          required
        />

        <Dropdown
          label="Level / Squad"
          value={state.defaults.squadId}
          onChange={(squadId) =>
            dispatch({ type: "SET_DEFAULTS", defaults: { squadId } })
          }
          options={SQUADS.map((s) => ({ value: s.id, label: s.label }))}
          placeholder="Please select a level"
          required
          disabled={!state.defaults.sport}
          helperText={
            !state.defaults.sport ? "Select a sport first" : undefined
          }
        />

        <Dropdown
          label="Game Segment"
          value={state.defaults.segmentType}
          onChange={(segmentType) =>
            dispatch({ type: "SET_DEFAULTS", defaults: { segmentType } })
          }
          options={
            state.defaults.sport
              ? SEGMENT_TYPES[state.defaults.sport].map((s) => ({
                  value: s.value,
                  label: s.label,
                }))
              : []
          }
          placeholder="Select segment type"
          disabled={!state.defaults.sport}
          helperText="Auto-selected based on sport"
        />

        <Dropdown
          label="Timezone"
          value={state.defaults.timezone}
          onChange={(timezone) =>
            dispatch({ type: "SET_DEFAULTS", defaults: { timezone } })
          }
          options={TIMEZONES.map((tz) => ({ value: tz.value, label: tz.label }))}
        />

        <Dropdown
          label="Organization"
          value={state.defaults.orgId === null ? -1 : state.defaults.orgId}
          onChange={handleOrgChange}
          options={ORGANIZATIONS.map((org) => ({ value: org.value, label: org.label }))}
          placeholder="Select organization"
          required
          helperText="High School is the default"
        />

        <Dropdown
          label="State"
          value={state.defaults.state}
          onChange={(state) =>
            dispatch({ type: "SET_DEFAULTS", defaults: { state } })
          }
          options={US_STATES.map((s) => ({ value: s.value, label: s.label }))}
          placeholder="Select state"
          required
          helperText="Limits team search to this state only"
        />
      </div>

      {/* Custom Org ID input when "Other" is selected */}
      {(state.defaults.orgId === null || state.defaults.orgId === -1) && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-[var(--ss-text)] mb-2">
            Custom Organization ID
            <span className="text-[var(--ss-error)] ml-1">*</span>
          </label>
          <input
            type="number"
            value={customOrgId}
            onChange={(e) => handleCustomOrgIdChange(e.target.value)}
            placeholder="Enter organization ID"
            className="ss-input max-w-xs"
          />
          <p className="text-xs text-[var(--ss-text-light)] mt-1">
            Enter the ScoreStream organization ID
          </p>
        </div>
      )}

      <div className="flex justify-between mt-8">
        <Button variant="secondary" onClick={handleBack}>
          Previous
        </Button>
        <Button onClick={handleNext} disabled={!canProceed}>
          Next
        </Button>
      </div>
    </Card>
  );
}
