import N19baseApplet from './n19baseApplet'
import N19popupController from './n19popupController'
import N19popupApplet from './n19popupApplet'

export default class Nexus extends N19baseApplet {
  constructor(settings) {
    super(settings)

    // get the n19popupController singleton instance
    this.n19popupController = N19popupController.instance
    this.n19popupController.settings = Object.assign(
      this.n19popupController.settings || {},
      settings
    )
  }

  closePopupApplet(nb) {
    return this.n19popupController.closePopupApplet(nb)
  }

  _showPopupApplet(name, hide, cb) {
    if (!this.n19popupController.canOpenPopup()) {
      throw new Error(
        '[NB] Cannot open popup (currently exists resolve function)'
      )
    }
    this._setActiveControl(name)
    return this.n19popupController.showPopupApplet(hide, cb, this, 'EditPopup')
  }

  changeRecords(hide, cb) {
    if (!this.n19popupController.canOpenPopup()) {
      throw new Error(
        '[NB] Cannot open popup (currently exists resolve function)'
      )
    }
    return this.n19popupController.showPopupApplet(
      hide,
      cb,
      this,
      'ChangeRecords'
    )
  }

  showMvgApplet(name, hide, cb) {
    const control = this._getControl(name)
    if (!control) {
      throw new Error(
        `[NB] Cannot find a control by name ${name} to show Mvg applet.`
      )
    }
    const uiType = control.GetUIType()
    if (uiType !== this.consts.get('SWE_CTRL_MVG')) {
      throw new Error(
        `Control ${name} is not of supported type ${uiType} to show Mvg applet`
      )
    }
    if (this.pm.Get('IsInQueryMode')) {
      throw new Error('[NB] Mvg applet cannot be opened in query mode')
    }
    return this._showPopupApplet(name, hide, cb)
  }

  showPickApplet(name, hide, cb) {
    const control = this._getControl(name)
    if (!control) {
      throw new Error(
        `[NB] Cannot find a control by name ${name} to show Pick applet.`
      )
    }
    const uiType = control.GetUIType()
    if (uiType !== this.consts.get('SWE_CTRL_PICK')) {
      throw new Error(
        `Control ${name} is not of supported type ${uiType} to show Pick applet`
      )
    }
    return this._showPopupApplet(name, hide, cb)
  }

  _newAssocRecord() {
    return new Promise(resolve =>
      this.pm.ExecuteMethod('InvokeMethod', 'NewRecord', null, {
        async: true,
        cb: resolve
      })
    )
  }

  openAssocApplet(hide, cb) {
    // this method should be available for child business component in M:M relationship
    if (!this.n19popupController.canOpenPopup()) {
      throw new Error(
        '[NB] Cannot open popup (currently exists resolve function)'
      )
    }
    if (!this.canInvokeMethod('NewRecord')) {
      throw new Error('[NB] NewRecord is not available') // also when in query mode
    }
    return this.n19popupController._openAssocApplet(
      hide,
      this._newAssocRecord.bind(this),
      cb
    )
  }

  drilldown(controlName) {
    if (this.isListApplet) {
      // TODO: check isLink of control?
      // index is not effective, and drilldown anyway happens on the selected record
      const index = this.getSelection()

      // return this.pm.ExecuteMethod('OnDrillDown', controlName, index);
      return this.pm.OnControlEvent(
        this.consts.get('PHYEVENT_DRILLDOWN_LIST'),
        controlName,
        index
      )
    }
    // else lets assume it is form applet
    const control = this._getControl(controlName)
    if (!control) {
      throw new Error(`[NB] Control ${controlName} is not found`)
    }
    return this.pm.OnControlEvent(
      this.consts.get('PHYEVENT_DRILLDOWN_FORM'),
      control
    )
    // const ps = control.GetMethodPropSet();
    // return this.pm.ExecuteMethod('InvokeMethod', 'DrillDown', ps);
  }

  drilldownPromised(controlName) {
    return new Promise(resolve => {
      this.n19popupController.viewLoadedResolve = resolve
      this.drilldown(controlName)
    })
  }

  gotoView(viewName, appletName, id) {
    // TODO: check if current record exists this.getCurrentRecord
    id = typeof id === 'undefined' ? (this.getCurrentRecord(true) || {}).Id : id

    if (appletName && id) {
      let SWECmd = `GotoView&SWEView=${viewName}&SWEApplet0=${appletName}`
      SWECmd += `&SWEBU=1&SWEKeepContext=FALSE&SWERowId0=${id}`
      SWECmd = encodeURI(SWECmd)
      return window.SiebelApp.S_App.GotoView(viewName, '', SWECmd, '')
    } else {
      return window.SiebelApp.S_App.GotoView(viewName)
    }
  }

  gotoViewPromised(targetViewName, appletName, id) {
    return this.n19popupController.gotoView(
      this,
      this.gotoView,
      targetViewName,
      appletName,
      id
    )
  }

  reInitPopup() {
    // do we need to keep also static ReInitPopup
    this.n19popupController.isPopupHidden = false

    const popupPM = window.SiebelApp.S_App.GetPopupPM()
    popupPM.Init()
    popupPM.Setup()
  }

  static ReInitPopup() {
    // could be removed in the next version
    const popupPM = window.SiebelApp.S_App.GetPopupPM()
    popupPM.Init()
    popupPM.Setup()
  }

  // TODO: remove this method, and have it is in API only, v2.1?
  pickRecordById(controlName, rowId) {
    return (
      this.showPickApplet(controlName, true)
        // is not needed when PR approach is used
        .then(obj => new Promise(resolve => setTimeout(() => resolve(obj), 0)))
        .then(obj => {
          const found = obj.popupAppletN19.queryByIdSync(rowId)
          if (found !== 1) {
            throw new Error(`[NB] The record ${rowId} is not found (${found})`)
          }
          return obj.popupAppletN19.pickRecord()
        })
    )
  }

  // TODO: remove this method, and have it is in API only, v2.1
  assocRecordsById(controlName, arr, closeApplet) {
    return (
      this.showMvgApplet(controlName, true)
        // is not needed when PR approach is used
        .then(obj => new Promise(resolve => setTimeout(() => resolve(obj), 0)))
        .then(
          obj =>
            new Promise(resolve => {
              const found = obj.assocAppletN19.queryByIdSync(arr)
              if (found !== arr.length) {
                // TODO: throw an error?
                console.warn(
                  `[NB] The amount of found records(${found}) does not match to input array length(${arr.length})`
                )
              }
              if (found > 0) {
                obj.popupAppletN19.addAllRecords()
              }
              if (closeApplet) {
                this.closePopupApplet()
                resolve(found)
              } else {
                obj.found = found
                resolve(obj)
              }
            })
        )
    )
  }

  static CreatePopupNB(settings) {
    if (!settings.pm || !settings.pm.Get('IsPopup')) {
      throw new Error('[NB] No pm or the given pm is not popup applet PM')
    }

    const popupPM = window.SiebelApp.S_App.GetPopupPM()
    const isShuttle = popupPM.Get('isPopupMVGAssoc')
    const mvgAssoc = popupPM.Get('MVGAssocAppletObject')

    settings.isMvgAssoc =
      isShuttle && mvgAssoc && settings.pm.Get('GetName') === mvgAssoc.GetName()
    settings.isPopup = true
    return new N19popupApplet(settings)
  }
}
