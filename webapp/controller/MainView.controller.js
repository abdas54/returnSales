sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, MessageToast, Fragment, MessageBox) {
        "use strict";
        var that;
        return Controller.extend("com.eros.returnsales.controller.MainView", {
            onInit: function () {
                that = this;
                $("body").css("zoom", "90%");
                this.getView().byId("page").setVisible(false);
                this.oModel = this.getOwnerComponent().getModel();

                this.customerAddressModel = new JSONModel();
                this.getView().setModel(this.customerAddressModel, "custAddModel");

                this.customerModel = this.getOwnerComponent().getModel("customerService");
                this.getView().setModel(this.customerModel, "CustomerModel");

                var showSection = new JSONModel();
                showSection.setData({
                    "selectedMode": ""
                });
                this.getView().setModel(showSection, "ShowSection");

                var model3 = new JSONModel();
                model3.setData({
                    "selectedMode": "Cash",
                    "cardPaymentMode": 0
                });
                this.getView().setModel(model3, "ShowPaymentSection");

                var model4 = new JSONModel();
                model4.setData({
                    "selectedMode": "Item List",

                });
                this.getView().setModel(model4, "ShowDiscountSection");

                this.validateLoggedInUser();
                this.shippingMethod = "";
                this.paymentEntSourceCounter = 0;
                this.paymentId = 0;
                this.sourceIdCounter = 0;
                this.aPaymentEntries = [];
                this.aReturnSerialsNo = [];
                this.aEntries1 = [];

            },
            validateLoggedInUser: function () {
                var that = this;
                this.oModel.read("/StoreIDSet", {
                    success: function (oData) {
                        that.storeID = oData.results[0] ? oData.results[0].Store : "";
                        that.plantID = oData.results[0] ? oData.results[0].Plant : "";
                        that.onPressPayments();
                    },
                    error: function (oError) {
                        sap.m.MessageBox.show(JSON.parse(oError.responseText).error.message.value, {
                            icon: sap.m.MessageBox.Icon.Error,
                            title: "Error",
                            actions: [MessageBox.Action.OK],
                            onClose: function (oAction) {
                                if (oAction === MessageBox.Action.OK) {
                                    window.history.go(-1);
                                }
                            }
                        });
                    }
                });
            },
            onPressPayments: function () {
                if (!this._oDialogCashier) {
                    Fragment.load({
                        name: "com.eros.returnsales.fragment.cashier",
                        controller: this
                    }).then(function (oFragment) {
                        this._oDialogCashier = oFragment;
                        this.getView().addDependent(this._oDialogCashier);
                        this._oDialogCashier.open();
                    }.bind(this));
                } else {
                    this._oDialogCashier.open();
                }
            },
            fnCloseCashier: function () {
                this._oDialogCashier.close();
            },
            fnValidateCashier: function (oEvent) {
                var that = this;
                that.getView().byId("page").setVisible(false);
                var empId = oEvent.getSource().getParent().getContent()[0].getItems()[0].getContent()[1].getValue();
                var pwd = oEvent.getSource().getParent().getContent()[0].getItems()[0].getContent()[3].getValue();
                var aFilters = [];

                aFilters.push(new sap.ui.model.Filter("Etype", sap.ui.model.FilterOperator.EQ, "C"));
                aFilters.push(new sap.ui.model.Filter("EmployeeId", sap.ui.model.FilterOperator.EQ, empId));
                aFilters.push(new sap.ui.model.Filter("SecretCode", sap.ui.model.FilterOperator.EQ, pwd));
                aFilters.push(new sap.ui.model.Filter("Generate", sap.ui.model.FilterOperator.EQ, "N"));
                //EmployeeSet?$filter=Etype eq 'C' and EmployeeId eq '112' and SecretCode eq 'Abc#91234'

                this.oModel.read("/EmployeeSet", {
                    filters: aFilters,
                    success: function (oData) {
                        that.cashierID = oData.results[0] ? oData.results[0].EmployeeId : "";
                        that.cashierName = oData.results[0] ? oData.results[0].EmployeeName : "";
                        that._oDialogCashier.close();
                        that.getView().byId("cashier").setCount(oData.results[0].EmployeeName);
                        // that.getView().byId("tranNumber").setCount(oData.results[0].TransactionId);
                        that.getView().byId("page").setVisible(true);

                    },
                    error: function (oError) {
                        that.getView().byId("page").setVisible(false);
                        if (JSON.parse(oError.responseText).error.code === "CASHIER_CHECK") {
                            sap.m.MessageBox.show(
                                JSON.parse(oError.responseText).error.message.value, {
                                icon: sap.m.MessageBox.Icon.Error,
                                title: "Cashier Validation",
                                actions: ["OK", "CANCEL"],
                                onClose: function (oAction) {

                                }
                            }
                            );
                        }
                        else {
                            sap.m.MessageBox.show(
                                JSON.parse(oError.responseText).error.message.value, {
                                icon: sap.m.MessageBox.Icon.Error,
                                title: "Error",
                                actions: ["OK", "CANCEL"],
                                onClose: function (oAction) {

                                }
                            }
                            );
                        }
                        console.error("Error", oError);
                    }
                });

            },
            onPressCustData: function () {
                var oModel = new sap.ui.model.json.JSONModel({
                    customerData: [{
                        option: "Basic Information"
                    }, {
                        option: "Customer Address"
                    }]
                });
                this.getView().setModel(oModel, "CustModel");
                if (!this._oDialogCust) {
                    Fragment.load({
                        name: "com.eros.returnsales.fragment.customer",
                        controller: this
                    }).then(function (oFragment) {
                        this._oDialogCust = oFragment;
                        this.getView().addDependent(this._oDialogCust);
                        this._oDialogCust.open();
                    }.bind(this));
                } else {
                    this._oDialogCust.open();
                }

            },
            onPressCustClose: function () {
                this._oDialogCust.close();
            },
            onPressCustSaveClose: function () {
                this.shippingAddress = "";
                this.shippingDate = "";
                this.shippingInst = "";

                var custData = this.getView().getModel("custAddModel").getData();
                var bFlag = this.validateCustomer();
                var addressParts = [];
                var customerName = [];



                if (custData.Name1) {
                    customerName.push(custData.Name1);
                }
                if (custData.Name2) {
                    customerName.push(custData.Name2);
                }
                var custName = customerName.join(" ");
                //this.getView().byId("customer").setCount(custName);
                var selAddIndex = sap.ui.getCore().byId("addressRbGrp").getSelectedIndex();
                if (selAddIndex === 0) {

                    if (custData.home_add1) {
                        addressParts.push(custData.home_add1);
                    }
                    if (custData.home_add2) {
                        addressParts.push(custData.home_add2);
                    }
                    if (custData.home_po) {
                        addressParts.push(custData.home_po);
                    }
                    if (custData.home_City) {
                        addressParts.push(custData.home_City);
                    }
                    if (custData.home_Country) {
                        addressParts.push(custData.home_Country);
                    }

                }
                else if (selAddIndex === 1) {

                    if (custData.off_add1) {
                        addressParts.push(custData.home_add1);
                    }
                    if (custData.off_add2) {
                        addressParts.push(custData.home_add2);
                    }
                    if (custData.off_po) {
                        addressParts.push(custData.home_po);
                    }
                    if (custData.off_City) {
                        addressParts.push(custData.home_City);
                    }
                    if (custData.off_Country) {
                        addressParts.push(custData.home_Country);
                    }



                } else {

                    if (custData.oth_add1) {
                        addressParts.push(custData.home_add1);
                    }
                    if (custData.oth_add2) {
                        addressParts.push(custData.home_add2);
                    }
                    if (custData.oth_po) {
                        addressParts.push(custData.home_po);
                    }
                    if (custData.oth_City) {
                        addressParts.push(custData.home_City);
                    }
                    if (custData.oth_Country) {
                        addressParts.push(custData.home_Country);
                    }



                }
                this.shippingAddress = addressParts.join(" ");



                if (custData.shippingDate) {
                    var date = new Date(custData.shippingDate);
                    var pad = (n) => String(n).padStart(2, '0');
                    // this.shippingDate = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
                    this.shippingDate = custData.shippingDate;
                }

                if (custData.ShippingInst) {
                    this.shippingInst = custData.ShippingInst;
                }



                if (bFlag) {
                    this.updateCustomer();
                }

                // this._oDialogCust.close();

            },
            validateCustomer: function () {
                var bFlag;

                var custData = this.getView().getModel("custAddModel").getData();
                var errorMessage = "";

                // Basic Required Fields
                if (!custData.Name1 || custData.Name1.trim() === "") {
                    errorMessage += "First Name is required.\n";
                }
                if (!custData.country_code || custData.country_code.trim() === "") {
                    errorMessage += "Country Code is required.\n";
                }
                if (!custData.MobNo || custData.MobNo.trim() === "") {
                    errorMessage += "Mobile Number is required.\n";
                }
                if (!custData.CustType || custData.CustType.trim() === "") {
                    errorMessage += "Customer Type is required.\n";
                }

                // Additional fields for Tourist (CustType === "2")
                if (custData.CustType === "2") {
                    if (!custData.CardType || custData.CardType.trim() === "") {
                        errorMessage += "Card Type is required for Tourists.\n";
                    }
                    if (!custData.IssueBy || custData.IssueBy.trim() === "") {
                        errorMessage += "Issued By is required for Tourists.\n";
                    }
                    if (!custData.IdenCardNum || custData.IdenCardNum.trim() === "") {
                        errorMessage += "Card Number is required for Tourists.\n";
                    }
                }


                // Show message if there are errors
                if (errorMessage.length > 0) {
                    sap.m.MessageBox.error(errorMessage);
                    bFlag = false;
                }
                else {
                    bFlag = true;
                }

                return bFlag;


            },
            updateCustomer: function () {
                var that = this;
                var data = this.getView().getModel("custAddModel").getData();
                data.add_type = "";
                var shippingDate = data.shippingDate;
                var shipingInst = data.ShippingInst;
                var shipingMethod = data.ShippingMethod;
                delete (data.shippingDate);
                delete (data.ShippingInst);
                delete (data.ShippingMethod);
                this.customerModel.create("/ZER_CUST_MASTERSet", data, {
                    success: function (oData) {
                        that.getView().getModel("custAddModel").setData({});
                        that.getView().getModel("custAddModel").setData(oData);
                        that.getView().getModel("custAddModel").setProperty("/shippingDate", shippingDate);
                        that.getView().getModel("custAddModel").setProperty("/ShippingInst", shipingInst);
                        that.getView().getModel("custAddModel").setProperty("/ShippingMethod", shipingMethod);
                        that._oDialogCust.close();
                        sap.m.MessageToast.show("Customer Update Successfully");
                    },
                    error: function (oError) {
                        sap.m.MessageToast.show("Error while Updating Customer");

                    }
                });

            },
            onOptionSelect: function (oEvent) {
                var sSelectedOption = oEvent.getSource().getTitle();
                var showSection = new JSONModel();
                showSection.setData({
                    "selectedMode": sSelectedOption
                });
                this.getView().setModel(showSection, "ShowSection");
                //	sap.m.MessageToast.show("Selected: " + sSelectedOption);
            },
            onSearchNumber: function (oEvent) {
                var that = this;
                var searchNumber = oEvent.getParameter("query");
                this.customerModel.read("/ZER_CUST_MASTERSet(Kunnr='',MobNo='" + searchNumber + "')", {
                    success: function (oData) {
                        if (oData) {
                            // this.getView().setModel(oModel1, "AddressModel");
                            that.getView().getModel("custAddModel").setData({});
                            that.getView().getModel("custAddModel").setData(oData);
                            that.getView().getModel("custAddModel").refresh();
                            that.getView().getModel("ShowSection").setProperty("/selectedMode", "Basic Information");

                            if ((oData.home_add1 !== "") || (oData.home_add2 !== "")) {
                                that.getView().byId("addressRbGrp").selectedIndex("1");
                            }
                            else if ((oData.off_add1 !== "") || (oData.off_add2 !== "")) {
                                that.getView().byId("addressRbGrp").selectedIndex("2");

                            }
                            else if ((oData.oth_Add1 !== "") || (oData.oth_Add2 !== "")) {
                                that.getView().byId("addressRbGrp").selectedIndex("3");

                            }
                            else {
                                that.getView().byId("addressRbGrp").selectedIndex("1");
                            }


                        }

                    },
                    error: function (oError) {
                        sap.m.MessageBox.show("Customer does not exist. Kindly add it", {
                            icon: sap.m.MessageBox.Icon.Error,
                            title: "Error",
                            actions: [MessageBox.Action.OK],
                            onClose: function (oAction) {
                                if (oAction === MessageBox.Action.OK) {
                                    that.getView().getModel("custAddModel").setData({});
                                    that.getView().getModel("ShowSection").setProperty("/selectedMode", "Basic Information");
                                }
                            }
                        });
                    }
                });
            },
            onSelectAddressType: function (oEvent) {
                if (oEvent.getParameter("selectedIndex") === 0) {
                    sap.ui.getCore().byId("homeSection").setVisible(true);
                    sap.ui.getCore().byId("workSection").setVisible(false);
                    sap.ui.getCore().byId("otherSection").setVisible(false);
                }
                if (oEvent.getParameter("selectedIndex") === 1) {
                    sap.ui.getCore().byId("homeSection").setVisible(false);
                    sap.ui.getCore().byId("workSection").setVisible(true);
                    sap.ui.getCore().byId("otherSection").setVisible(false);
                }
                if (oEvent.getParameter("selectedIndex") === 2) {
                    sap.ui.getCore().byId("homeSection").setVisible(false);
                    sap.ui.getCore().byId("workSection").setVisible(false);
                    sap.ui.getCore().byId("otherSection").setVisible(true);
                }
            },
            onCustomerTypeChange: function (oEvent) {

                if (oEvent.getParameter("selectedItem").getProperty("key") === "2") {
                    sap.ui.getCore().byId("cardTypelbl").setRequired(true);
                    sap.ui.getCore().byId("issuedBylbl").setRequired(true);
                    sap.ui.getCore().byId("cardNumberlbl").setRequired(true);
                }
                else {
                    sap.ui.getCore().byId("cardTypelbl").setRequired(false);
                    sap.ui.getCore().byId("issuedBylbl").setRequired(false);
                    sap.ui.getCore().byId("cardNumberlbl").setRequired(false);
                }

            },
            onSearch: function () {
                var tranNumber = this.getView().byId("salesTrans").getValue();
                this.getTransactionData();
            },
            getTransactionData: function (oEvent) {
                var that = this;
                var tranNumber = "";
                if (oEvent) {
                    tranNumber = oEvent.getParameter("value");
                }
                else {
                    tranNumber = this.getView().byId("salesTrans").getValue();
                }

                this.oModel.read("/SalesTransactionHeaderSet('" + tranNumber + "')", {
                    urlParameters: {
                        "$expand": "ToItems,ToDiscounts,ToPayments,ToSerials"
                    },

                    success: function (oData) {
                        that.ToDiscounts = oData.ToDiscounts;
                        that.ToPayments = oData.ToPayments;
                        that.ToSerials = oData.ToSerials;
                        that.getView().byId("tranNumber").setCount(tranNumber);
                        that.getView().byId("customer").setCount(oData.CustomerName);

                        //that.getView().byId("totalPrice").setText("0.00");
                        var oModel = new JSONModel();
                        oModel.setData({ "items": [] });
                        var aItems = oData.ToItems.results;
                        var aSerials = oData.ToSerials.results;
                        var mSerialsByItem = {};
                        aSerials.forEach(serial => {
                            var itemId = serial.TransactionItem;
                            if (!mSerialsByItem[itemId]) {
                                mSerialsByItem[itemId] = [];
                            }
                            mSerialsByItem[itemId].push(serial);
                        });

                        aItems.forEach(item => {
                            var itemId = item.TransactionItem;
                            item.returnQty = 0;
                            item.returnAmount = 0;
                            item.returnDiscount = 0;
                            item.returnTotalAmount = 0;
                            item.returnVATAmount = 0;
                            var serialsForItem = mSerialsByItem[itemId] || [];

                            // Add boolean as string
                            item.SerialNumbers = serialsForItem.length > 0 ? true : false;

                            // Optionally add the actual serials array for UI use
                            item.SerialList = serialsForItem;
                        });

                        oModel.setData({ "items": aItems });
                        oModel.refresh();

                        that.getView().setModel(oModel, "ProductModel");
                    },
                    error: function (oError) {
                        sap.m.MessageBox.show(
                            JSON.parse(oError.responseText).error.message.value, {
                            icon: sap.m.MessageBox.Icon.Error,
                            title: "Error",
                            actions: ["OK", "CANCEL"],
                            onClose: function (oAction) {

                            }
                        }
                        );


                    }
                });
            },
            formatSerialNumText: function (value) {
                if (value) {
                    return "Yes";
                }
                else {
                    return "No";
                }

            },
            enabledSerialNumber: function (value) {
                if (value) {
                    return true;
                }
                else {
                    return false;
                }
            },
            onScan: function () {
                var that = this;
                BarcodeScanner.scan(
                    function (mResult) {

                        if (!mResult.cancelled) {
                            that.getTransactionData(mResult.text);
                        }
                    },
                    function (Error) {
                        window.alert("Scanning Failed :" + Error)
                    }
                )

            },
            openSerialNumbers: function (oEvent) {
                var that = this;
                var selIndex = oEvent.getSource().getId().split("--")[2].split("-")[1];
                var selIndexData = this.getView().getModel("ProductModel").getObject("/items/" + selIndex);
                var matId = selIndexData.Material;
                var serNumModel = new JSONModel();
                serNumModel.setData({ "serNumber": [] });
                if (!that._oDialogSerNumber) {
                    Fragment.load({
                        name: "com.eros.returnsales.fragment.serialNumber",
                        controller: that
                    }).then(function (oFragment) {
                        that._oDialogSerNumber = oFragment;
                        serNumModel.setData({ "serNumber": selIndexData.SerialList });
                        that.getView().addDependent(that._oDialogSerNumber);
                        sap.ui.getCore().byId("matID").setText(matId);
                        that.getView().setModel(serNumModel, "SerialModel")
                        that._oDialogSerNumber.open();
                    }.bind(that));
                } else {
                    sap.ui.getCore().byId("matID").setText(matId);
                    serNumModel.setData({ "serNumber": selIndexData.SerialList });
                    that.getView().setModel(serNumModel, "SerialModel")
                    that._oDialogSerNumber.open();
                }
            },
            onCloseReturnSerial: function () {
                this._oDialogSerNumber.close();
            },
            onPressSaveReturnSerial: function () {
                var selectedItems = sap.ui.getCore().byId("serialList").getSelectedItems();
                if (selectedItems.length > 0) {
                    for (var count = 0; count < selectedItems.length; count++) {
                        var sPath = selectedItems[count].oBindingContexts.SerialModel.sPath;
                        var dataObj = this.getView().getModel("SerialModel").getObject(sPath);
                        this.aReturnSerialsNo.push(dataObj);
                    }
                    this._oDialogSerNumber.close();
                }
                else {
                    this._oDialogSerNumber.close();
                }

            },
            onSubtract: function (oEvent) {
                var selIndex = oEvent.getSource().getId().split("--")[2].split("-")[1];
                var selIndexData = this.getView().getModel("ProductModel").getObject("/items/" + selIndex);
                var actQuantity = selIndexData.Quantity;
                var qtyValue = oEvent.getSource().getEventingParent().getItems()[1].getValue();
                var iValue = parseInt(qtyValue, 10) || 0;
                if (iValue > 0) {

                    oEvent.getSource().getEventingParent().getItems()[1].setValue(iValue - 1);
                    var retQty = oEvent.getSource().getEventingParent().getItems()[1].getValue();
                    if ((parseInt(retQty) <= parseInt(actQuantity))) {
                        this.getView().getModel("ProductModel").getObject("/items/" + selIndex).returnAmount = parseFloat(parseFloat(selIndexData.UnitPrice).toFixed(2) * parseFloat(retQty).toFixed(2)).toFixed(2);
                        this.getView().getModel("ProductModel").getObject("/items/" + selIndex).returnDiscount = parseFloat(parseFloat(selIndexData.UnitDiscount).toFixed(2) * parseFloat(retQty).toFixed(2)).toFixed(2);
                        var netAmount = this.getView().getModel("ProductModel").getObject("/items/" + selIndex).returnAmount;
                        var netDiscount = this.getView().getModel("ProductModel").getObject("/items/" + selIndex).returnDiscount
                        var vatPercent = this.getView().getModel("ProductModel").getObject("/items/" + selIndex).VatPercent
                        // this.getView().getModel("ProductModel").getObject("/Product/" + selIndex).NetAmount= parseFloat(parseFloat(netAmount) + parseFloat(netDiscount)).toFixed(2);
                        this.calculateVATAmount(netAmount, netDiscount, vatPercent, selIndex);
                        this.calculateSalesAmount(netAmount, netDiscount, vatPercent, selIndex);
                        this.updateTotalPrice();
                    }
                    else {
                        sap.m.MessageBox.show(
                            "Entered Quantity should not be more than Actual Quantity", {
                            icon: sap.m.MessageBox.Icon.Error,
                            title: "Error",
                            actions: ["OK"],
                            onClose: function (oAction) {


                            }
                        }
                        );

                    }
                }

            },
            onManualChangeQty: function (oEvent) {
                var event = oEvent;
                var qty = oEvent.getParameter("newValue");
                var selIndex = oEvent.getSource().getParent().getId().split("--")[2].split("-")[1];
                var selIndexData = this.getView().getModel("ProductModel").getObject("/items/" + selIndex);
                var actQuantity = selIndexData.Quantity;



                if ((qty.toString() !== "0")) {
                    if ((parseInt(qty) <= parseInt(actQuantity))) {

                        var qtyValue = qty;
                        var iValue = parseInt(qtyValue, 10) || 0;
                        selIndexData.returnAmount = parseFloat(parseFloat(selIndexData.UnitPrice).toFixed(2) * parseFloat(iValue).toFixed(2)).toFixed(2);
                        selIndexData.returnDiscount = parseFloat(parseFloat(selIndexData.UnitDiscount).toFixed(2) * parseFloat(iValue).toFixed(2)).toFixed(2);

                        var netAmount = selIndexData.returnAmount;
                        var netDiscount = selIndexData.returnDiscount
                        var vatPercent = selIndexData.VatPercent
                        // selIndexData.NetAmount= parseFloat(parseFloat(netAmount) + parseFloat(netDiscount)).toFixed(2);
                        this.calculateVATAmount(netAmount, netDiscount, vatPercent, selIndex);
                        this.calculateSalesAmount(netAmount, netDiscount, vatPercent, selIndex);
                        this.updateTotalPrice();
                    }
                    else {
                        oEvent.getSource().setValue(0);
                        sap.m.MessageBox.show(
                            "Entered Quantity should not be more than Actual Quantity", {
                            icon: sap.m.MessageBox.Icon.Error,
                            title: "Error",
                            actions: ["OK"],
                            onClose: function (oAction) {


                            }
                        }
                        );

                    }
                }
                else {
                    oEvent.getSource().setValue(0);
                    sap.m.MessageBox.show(
                        "Entered Quantity should not be zero", {
                        icon: sap.m.MessageBox.Icon.Error,
                        title: "Error",
                        actions: ["OK"],
                        onClose: function (oAction) {
                            event.getSource().setValue(1);
                            event.getSource().fireChange();
                        }
                    }
                    );
                }


            },
            onAddition: function (oEvent) {
                var selIndex = oEvent.getSource().getId().split("--")[2].split("-")[1];
                var selIndexData = this.getView().getModel("ProductModel").getObject("/items/" + selIndex);
                var actQuantity = selIndexData.Quantity;
                var qtyValue = oEvent.getSource().getEventingParent().getItems()[1].getValue();
                var iValue = parseInt(qtyValue, 10) || 0;



                oEvent.getSource().getEventingParent().getItems()[1].setValue(iValue + 1);
                var retQty = oEvent.getSource().getEventingParent().getItems()[1].getValue();
                if ((parseInt(retQty) <= parseInt(actQuantity))) {

                    this.getView().getModel("ProductModel").getObject("/items/" + selIndex).returnAmount = parseFloat(parseFloat(selIndexData.UnitPrice).toFixed(2) * parseFloat(retQty).toFixed(2)).toFixed(2);
                    this.getView().getModel("ProductModel").getObject("/items/" + selIndex).returnDiscount = parseFloat(parseFloat(selIndexData.UnitDiscount).toFixed(2) * parseFloat(retQty).toFixed(2)).toFixed(2);

                    var netAmount = this.getView().getModel("ProductModel").getObject("/items/" + selIndex).returnAmount;
                    var netDiscount = this.getView().getModel("ProductModel").getObject("/items/" + selIndex).returnDiscount
                    var vatPercent = this.getView().getModel("ProductModel").getObject("/items/" + selIndex).VatPercent

                    this.calculateVATAmount(netAmount, netDiscount, vatPercent, selIndex);
                    this.calculateSalesAmount(netAmount, netDiscount, vatPercent, selIndex);
                    this.updateTotalPrice();
                }
                else {
                    oEvent.getSource().getEventingParent().getItems()[1].setValue(parseInt(retQty) - 1);
                    sap.m.MessageBox.show(
                        "Entered Quantity should not be zero", {
                        icon: sap.m.MessageBox.Icon.Error,
                        title: "Error",
                        actions: ["OK"],
                        onClose: function (oAction) {
                            // event.getSource().setValue(1);
                            // event.getSource().fireChange();
                        }
                    }
                    );
                }

            },
            calculateSalesAmount: function (netAmount, netDiscount, vatPercent, selIndex) {
                var netPrice = parseFloat(parseInt(parseFloat(netAmount).toFixed(2)) - parseInt(parseFloat(netDiscount).toFixed(2))).toFixed(2);
                var vatAmount = parseFloat(parseInt(netPrice) * (parseInt(parseFloat(vatPercent).toFixed(2)) / 100)).toFixed(2);
                this.getView().getModel("ProductModel").getObject("/items/" + selIndex).returnTotalAmount = parseFloat(vatAmount) + parseFloat(netPrice);
                this.getView().getModel("ProductModel").refresh();
            },
            calculateVATAmount: function (netAmount, netDiscount, vatPercent, selIndex) {
                var netPrice = parseFloat(parseInt(parseFloat(netAmount).toFixed(2)) - parseInt(parseFloat(netDiscount).toFixed(2))).toFixed(2);
                var vatAmount = parseFloat(parseInt(netPrice) * (parseInt(parseFloat(vatPercent).toFixed(2)) / 100)).toFixed(2);
                this.getView().getModel("ProductModel").getObject("/items/" + selIndex).VatAmount = vatAmount;
                this.getView().getModel("ProductModel").getObject("/items/" + selIndex).returnVATAmount = vatAmount;
                this.getView().getModel("ProductModel").refresh();

            },
            updateTotalPrice: function () {
                var productTblData = this.getView().getModel("ProductModel").getProperty("/items");
                var totalPrice = 0;
                var totalQty = 0;
                var totalVAT = 0;
                var totalDiscount = 0;
                var totalGross = 0;
                for (var count = 0; count < productTblData.length; count++) {
                    totalPrice = parseFloat(parseFloat(totalPrice) + parseFloat(productTblData[count].returnTotalAmount)).toFixed(2);
                    totalGross = parseFloat(parseFloat(totalGross) + parseFloat(productTblData[count].returnAmount)).toFixed(2)
                    totalQty = totalQty + parseInt(productTblData[count].returnQty);
                    totalVAT = parseFloat(parseFloat(totalVAT) + parseFloat(productTblData[count].returnVATAmount)).toFixed(2);
                    totalDiscount = parseFloat(parseFloat(totalDiscount) + parseFloat(productTblData[count].returnDiscount)).toFixed(2)
                }
                this.getView().byId("saleAmount").setCount(totalPrice);
                this.getView().byId("qty").setCount(totalQty);
                this.getView().byId("vat").setCount(totalVAT);
                this.getView().byId("gross").setCount(totalGross);
                this.getView().byId("discount").setCount(totalDiscount);
                //this.getView().byId("totalPrice").setText(totalPrice);
            },
            onPressDiscount: function () {
                if (this.getView().byId("idProductsTable").getSelectedItems().length > 0) {
                    var oTable = this.byId("idProductsTable");
                    var aSelectedContexts = oTable.getSelectedContexts();
                    var aSelectedData = aSelectedContexts.map(function (oContext) {
                        return oContext.getObject();
                    });

                    // Create a JSON model with selected data
                    var oSelectedItemsModel = new sap.ui.model.json.JSONModel();
                    oSelectedItemsModel.setData({ items: [] });
                    oSelectedItemsModel.setData({ items: aSelectedData });
                    this.getView().setModel(oSelectedItemsModel, "SelectedItemsModel");


                    var oModel = new sap.ui.model.json.JSONModel({
                        DiscountList: [{
                            option: "Item List"
                        }, {
                            option: "Discounts Condition"
                        }, {
                            option: "Reason Type"
                        }, {
                            option: "Authority"
                        }, {
                            option: "Amount"
                        }, {
                            option: "View All Records"
                        }]
                    });
                    this.getView().setModel(oModel, "DiscountModel");
                    var oModel1 = new sap.ui.model.json.JSONModel();
                    this.getView().setModel(oModel1, "DiscountValue");
                    if (!this._oDialogDiscoun1) {
                        Fragment.load({
                            name: "com.eros.returnsales.fragment.discount",
                            controller: this
                        }).then(function (oFragment) {
                            this._oDialogDiscoun1 = oFragment;
                            this._oDialogDiscoun1.setModel(oSelectedItemsModel, "SelectedItemsModel");
                            this.getView().addDependent(this._oDialogDiscoun1);
                            this.getView().getModel("SelectedItemsModel").refresh();
                            this._oDialogDiscoun1.open();

                        }.bind(this));
                    } else {
                        this._oDialogDiscoun1.setModel(oSelectedItemsModel, "SelectedItemsModel");
                        this.getView().getModel("SelectedItemsModel").refresh();
                        this._oDialogDiscoun1.open();

                    }
                } else {
                    MessageBox.error("Kindly select the item for Return");
                }
            },
            onDiscountSectSelected: function (oEvent) {
                var sSelectedOption = oEvent.getSource().getTitle();
                var showSection = new JSONModel();
                showSection.setData({
                    "selectedMode": sSelectedOption,

                });
                this.getView().setModel(showSection, "ShowDiscountSection");

                if (sSelectedOption === "View All Records") {
                    this.addDiscount();
                }
            },
            holdDiscountItem: function (oEvent) {
                var itemCode = oEvent.getParameter("listItem").getBindingContext("SelectedItemsModel").getObject().Material;
                var itemDesc = oEvent.getParameter("listItem").getBindingContext("SelectedItemsModel").getObject().Material;
                var transactionItem = oEvent.getParameter("listItem").getBindingContext("SelectedItemsModel").getObject().TransactionItem;
                var transactionId = oEvent.getParameter("listItem").getBindingContext("SelectedItemsModel").getObject().TransactionId;
                this.getView().getModel("DiscountValue").setProperty("/ItemCode", itemCode);
                this.getView().getModel("DiscountValue").setProperty("/ItemDesc", itemDesc);
                this.getView().getModel("DiscountValue").setProperty("/TransactionItem", transactionItem);
                this.getView().getModel("DiscountValue").setProperty("/TransactionId", transactionId);
                this.getView().getModel("ShowDiscountSection").setProperty("/selectedMode", "Discounts Condition");
            },
            holdDiscountCondition: function (oEvent) {
                var conditionType = oEvent.getParameter("listItem").getBindingContext().getObject().ConditionType;
                var conditionName = oEvent.getParameter("listItem").getBindingContext().getObject().ConditionName;
                this.getView().getModel("DiscountValue").setProperty("/ConditionType", conditionType);
                this.getView().getModel("DiscountValue").setProperty("/ConditionName", conditionName);
                this.getView().getModel("ShowDiscountSection").setProperty("/selectedMode", "Reason Type");
            },
            holdReasonType: function (oEvent) {
                var reason = oEvent.getParameter("listItem").getBindingContext().getObject().Reason;
                this.getView().getModel("DiscountValue").setProperty("/Reason", reason);
                this.getView().getModel("ShowDiscountSection").setProperty("/selectedMode", "Authority");
            },
            holdAuthority: function (oEvent) {
                var authority = oEvent.getParameter("listItem").getBindingContext().getObject().Authority;
                this.getView().getModel("DiscountValue").setProperty("/Authority", authority);
                this.getView().getModel("ShowDiscountSection").setProperty("/selectedMode", "Amount");
            },
            holdDiscountAmount: function (oEvent) {
                var discAmount = oEvent.getParameter("value");
                this.getView().getModel("DiscountValue").setProperty("/DiscAmount", discAmount);
                this.addDiscount();
                this.getView().getModel("ShowDiscountSection").setProperty("/selectedMode", "View All Records");
                sap.ui.getCore().byId("discountAmount").setValue("");


            },
            addDiscount: function () {
                var duplicate = false;
                var discountData = this.getView().getModel("DiscountValue").getData();
                if (this.aEntries1.length > 0) {

                    for (var count = 0; count < this.aEntries1.length; count++) {
                        if (this.aEntries1[count].ItemCode === discountData.ItemCode && this.aEntries1[count].Type === discountData.ConditionType) {
                            duplicate = true;
                            break;
                        }
                    }
                }

                if (!duplicate) {
                    if (discountData.ItemCode && discountData.ConditionType) {
                        this.aEntries1.push({
                            ItemCode: discountData.ItemCode,
                            ItemDescription: discountData.ItemDesc,
                            Reason: discountData.Reason,
                            Type: discountData.ConditionType,
                            Amount: discountData.DiscAmount,
                            Authority: discountData.Authority,
                            ConditionName: discountData.ConditionName,
                            DiscountType: "M",
                            TransactionItem: discountData.TransactionItem,
                            TransactionId: discountData.TransactionId

                        });
                    }
                }
                else {
                    MessageBox.error("Same Discount has been already applied. Kindly Delete the existing record to add new Discount");
                }

                var oModel1 = new sap.ui.model.json.JSONModel();
                oModel1.setData({ "entries": this.aEntries1 });
                this.getView().setModel(oModel1, "discountModelTable");

                this.getView().getModel("DiscountValue").setProperty("/ItemCode", "");
                this.getView().getModel("DiscountValue").setProperty("/ItemDesc", "");
                this.getView().getModel("DiscountValue").setProperty("/ConditionType", "");
                this.getView().getModel("DiscountValue").setProperty("/ConditionName", "");
                this.getView().getModel("DiscountValue").setProperty("/DiscAmount", "");
                this.getView().getModel("DiscountValue").setProperty("/Authority", "");
                this.getView().getModel("DiscountValue").setProperty("/Reason", "");
                this.getView().getModel("DiscountValue").setProperty("/TransactionItem", "");
                this.getView().getModel("DiscountValue").setProperty("/TransactionId", "");
                this.getView().getModel("DiscountValue").refresh();
            },
            onCloseManualDiscount1: function () {
                this._oDialogDiscoun1.close();
            },
            onApplyManualDiscount1: function () {
                var discountTblData = this.getView().getModel("discountModelTable").getProperty("/entries");
                var productTblData = this.getView().getModel("ProductModel").getProperty("/items");

                for (var count = 0; count < productTblData.length; count++) {

                    for (var count1 = 0; count1 < discountTblData.length; count1++) {
                        if (discountTblData[count1].ItemCode === productTblData[count].Material) {
                            var bflag = false;
                            for (var count2 = 0; count2 < this.ToDiscounts.results.length; count2++) {
                                var dataObj = this.ToDiscounts.results;
                                if (dataObj[count2].TransactionItem === discountTblData[count1].TransactionItem && dataObj[count2].ConditionName === discountTblData[count1].ConditionName) {
                                    bflag = true;
                                    break;
                                }

                            }
                            if (!bflag) {
                                this.ToDiscounts.results.push({
                                    "TransactionId": discountTblData[count1].TransactionId,
                                    "TransactionItem": discountTblData[count1].TransactionItem,
                                    "ConditionAmount": "-" + discountTblData[count1].Amount,
                                    "ConditionId": this.retrieveConditionId(discountTblData[count1].TransactionItem),
                                    "ConditionName": discountTblData[count1].ConditionName,
                                    "ConditionType": discountTblData[count1].Type,
                                    "Currency": "AED",
                                    "DiscountType": "M",
                                    "ModifierType": "D",
                                    "Remarks": discountTblData[count1].Reason,
                                    "Authority": discountTblData[count1].Authority

                                })
                                this.updateProductTable(count, productTblData[count], discountTblData[count1]);
                            }
                        }
                    }
                }
                this.onCloseManualDiscount1();

            },
            retrieveConditionId: function (sTransactionItem) {
                var aDiscounts = this.ToDiscounts.results;
                var aFiltered = aDiscounts.filter(function (oItem) {
                    return oItem.TransactionItem === sTransactionItem;
                });

                if (aFiltered.length === 0) {
                    // No existing conditions, start from '001'
                    return "001";
                }

                // Get numeric values of ConditionId and find the max
                var iMax = aFiltered.reduce(function (max, oItem) {
                    var iCurrent = parseInt(oItem.ConditionId, 10);
                    return iCurrent > max ? iCurrent : max;
                }, 0);

                // Increment and pad with leading zeros to 3 digits
                var sNextConditionId = (iMax + 1).toString().padStart(3, '0');
                return sNextConditionId;
            },
            updateProductTable: function (count, productTblData, discountTblData) {
                var selIndex = count;
                var updatedNetAmount = "";
                var retQty = this.getView().getModel("ProductModel").getObject("/items/" + selIndex).returnQty;
                var updateDiscount = parseFloat(parseFloat(productTblData.returnDiscount).toFixed(2) - parseFloat(discountTblData.Amount).toFixed(2)).toFixed(2);
                this.getView().getModel("ProductModel").getObject("/items/" + selIndex).returnDiscount = updateDiscount;

                updatedNetAmount = parseFloat(productTblData.UnitPrice).toFixed(2);
                this.getView().getModel("ProductModel").getObject("/items/" + selIndex).returnAmount = parseFloat(parseFloat(updatedNetAmount).toFixed(2) * parseFloat(retQty).toFixed(2)).toFixed(2);
                this.getView().getModel("ProductModel").getObject("/items/" + selIndex).returnDiscount = parseFloat(parseFloat(updateDiscount).toFixed(2) * parseFloat(retQty).toFixed(2)).toFixed(2);

                var netAmount = this.getView().getModel("ProductModel").getObject("/items/" + selIndex).returnAmount;
                var netDiscount = this.getView().getModel("ProductModel").getObject("/items/" + selIndex).returnDiscount
                var vatPercent = this.getView().getModel("ProductModel").getObject("/items/" + selIndex).VatPercent

                this.calculateVATAmount(netAmount, netDiscount, vatPercent, selIndex);
                this.calculateSalesAmount(netAmount, netDiscount, vatPercent, selIndex);
                this.updateTotalPrice();


                this.getView().getModel("ProductModel").refresh();
         


            },
             onDeleteManualDiscount1: function (oEvent) {

                var bflag = false;
                var oModel = this.getView().getModel("discountModelTable"); // Get the JSON model
                var aEntries = oModel.getProperty("/entries"); // Get the array from the model
                var oItem = oEvent.getParameter("listItem");
                var oContext = oItem.getBindingContext("discountModelTable");
                var dataObj = oModel.getObject(oContext.sPath);
                var iIndex = oContext.getPath().split("/").pop(); // Extract index
                var matchProdTableIndex = -1;
                var matchDiscTableIndex = -1;
                aEntries.splice(iIndex, 1);
                oModel.refresh();
                var productTblData = this.getView().getModel("ProductModel").getProperty("/items");
                for (var count = 0; count < productTblData.length; count++) {
                    var discountData = this.ToDiscounts.results;
                    for (var count2 = 0; count2 < discountData.length; count2++) {

                        if (dataObj.TransactionItem === discountData[count2].TransactionItem && dataObj.ConditionName === discountData[count2].ConditionName && dataObj.DiscountType === "M") {
                            bflag = true;
                            matchProdTableIndex = count;
                            matchDiscTableIndex = count2;
                            break;
                        }
                    }
                }
                if (bflag) {
                    this.removeManualDiscount(this.ToDiscounts.results[matchDiscTableIndex].TransactionItem, dataObj);
                    this.ToDiscounts.results.splice(matchDiscTableIndex, 1);
                }

            },
             removeManualDiscount: function (transactItem, discountTblData) {
                var productTablData = this.getView().getModel("ProductModel").getProperty("/items");
                 var lineItem = 0;
                for (var count = 0; count < productTablData.length; count++) {
                    if(transactItem === productTablData[count].TransactionItem){
                        lineItem = count;
                        break;                   
                     }
                }
                var selIndex = count;
                var updatedNetAmount = "";
                var retQty = this.getView().getModel("ProductModel").getObject("/items/" + selIndex).returnQty;
                var updateDiscount = parseFloat(parseFloat(productTablData[selIndex].returnDiscount) + parseFloat(discountTblData.Amount)).toFixed(2);
                this.getView().getModel("ProductModel").getObject("/items/" + selIndex).returnDiscount = updateDiscount;

             
                updatedNetAmount = parseFloat(productTablData[selIndex].UnitPrice).toFixed(2);
                this.getView().getModel("ProductModel").getObject("/items/" + selIndex).returnAmount = parseFloat(parseFloat(updatedNetAmount).toFixed(2) * parseFloat(retQty).toFixed(2)).toFixed(2);
                this.getView().getModel("ProductModel").getObject("/items/" + selIndex).returnDiscount = parseFloat(parseFloat(updateDiscount).toFixed(2) * parseFloat(retQty).toFixed(2)).toFixed(2);
                 
                var netAmount = this.getView().getModel("ProductModel").getObject("/items/" + selIndex).returnAmount;
                var netDiscount = this.getView().getModel("ProductModel").getObject("/items/" + selIndex).returnDiscount
                var vatPercent = this.getView().getModel("ProductModel").getObject("/items/" + selIndex).VatPercent

                this.calculateVATAmount(netAmount, netDiscount, vatPercent, selIndex);
                this.calculateSalesAmount(netAmount, netDiscount, vatPercent, selIndex);
                this.updateTotalPrice();


                this.getView().getModel("ProductModel").refresh();
                
                this.getView().getModel("ProductModel").refresh();
             }
                
        });
    });
