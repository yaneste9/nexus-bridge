import React, { useEffect, useReducer } from "react";
import Grid from "@material-ui/core/Grid";
import MenuItem from "@material-ui/core/MenuItem";
import InputField from "./components/InputField";
import SelectField from "./components/SelectField";
import SwitchField from "./components/SwitchField";

const Form = ({ formApplet, accountName, queryMode }) => {
  const initialState = {
    Name: {},
    AccountStatus: {},
    AccountTypeCode: {},
    "Fund Eligible Flag": {},
    Type: {}
  };

  const formReducer = (state, action) => {
    switch (action.type) {
      case "setField":
        return {
          ...state,
          [action.data.id]: action.data.value
        };
      case "reset":
        return initialState;
      default:
        throw new Error();
    }
  };

  const [fromState, dispatch] = useReducer(formReducer, initialState);

  // TODO: useCallback()
  const selectInit = () => {
    let newControls = { ...fromState };

    formApplet.getCurrentRecordModel(newControls);

    Object.keys(newControls).map(id =>
      dispatch({
        type: "setField",
        data: {
          id,
          value: newControls[id]
        }
      })
    );
  };

  // subscribe to account name
  useEffect(() => {
    selectInit();

    const token = formApplet.subscribe(() => {
      selectInit();
    });

    return () => {
      formApplet.unsubscribe(token);
    };
  }, [accountName, formApplet]);

  const accountStatusList = formApplet
    .getStaticLOV("AccountStatus")
    .map((lov, id) => (
      <MenuItem key={`AccountStatus_${id}`} value={lov}>
        {lov}
      </MenuItem>
    ));

  const accountTypeCodeList = formApplet
    .getStaticLOV("AccountTypeCode")
    .map((lov, id) => (
      <MenuItem key={`AccountTypeCode_${id}`} value={lov}>
        {lov}
      </MenuItem>
    ));

  const accountTypeList = formApplet.getStaticLOV("Type").map((lov, id) => (
    <MenuItem key={`Type_${id}`} value={lov}>
      {lov}
    </MenuItem>
  ));

  const handleChangeInput = name => event => {
    setControlValue(name, event.target.value);
  };

  const handleChangeSwitch = name => event => {
    setControlValue(name, event.target.checked);
  };

  const handleChangeList = name => event => {
    setControlValue(name, event.target.value);
  };

  const setControlValue = (id, value) => {
    if (!formApplet.setControlValue(id, value)) {
      value = formApplet.getCurrentRecord()[fromState[id].fieldName];
    }

    dispatch({
      type: "setField",
      data: {
        id,
        value: {
          ...fromState[id],
          value
        }
      }
    });
  };

  return (
    <div>
      <Grid container spacing={8} style={{ padding: 15 }}>
        <Grid item xs={8} sm={8} lg={8} xl={8}>
          <InputField
            controlName="Name"
            controlState={fromState["Name"]}
            onChange={handleChangeInput("Name")}
            queryMode={queryMode}
            style={{ width: "100%" }}
          />
        </Grid>

        <Grid item xs={4} sm={4} lg={4} xl={4}>
          <SwitchField
            controlName="Fund Eligible Flag"
            controlState={fromState["Fund Eligible Flag"]}
            onChange={handleChangeSwitch("Fund Eligible Flag")}
            queryMode={queryMode}
          />
          &nbsp;Fund Eligible
        </Grid>
      </Grid>

      <Grid container spacing={8} style={{ padding: 15 }}>
        <Grid item xs={4} sm={4} lg={4} xl={4}>
          <SelectField
            controlState={fromState["AccountStatus"]}
            onChange={handleChangeList("AccountStatus")}
            style={{ width: "100%" }}
            queryMode={queryMode}
          >
            {accountStatusList}
          </SelectField>
        </Grid>

        <Grid item xs={4} sm={4} lg={4} xl={4}>
          <SelectField
            controlState={fromState["AccountTypeCode"]}
            onChange={handleChangeList("AccountTypeCode")}
            style={{ width: "100%" }}
            queryMode={queryMode}
          >
            {accountTypeCodeList}
          </SelectField>
        </Grid>

        <Grid item xs={4} sm={4} lg={4} xl={4}>
          <SelectField
            controlState={fromState["Type"]}
            onChange={handleChangeList("Type")}
            style={{ width: "100%" }}
            queryMode={queryMode}
          >
            {accountTypeList}
          </SelectField>
        </Grid>
      </Grid>
    </div>
  );
};

export default Form;
