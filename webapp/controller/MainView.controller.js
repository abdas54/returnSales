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
    function (Controller,JSONModel,MessageToast,Fragment,MessageBox) {
        "use strict";
        var that;
        return Controller.extend("com.eros.returnsales.controller.MainView", {
            onInit: function () {
                that = this;
                $("body").css("zoom", "90%");
                this.getView().byId("page").setVisible(false);
                this.oModel = this.getOwnerComponent().getModel();

                this.customerAddressModel = new JSONModel();
                this.getView().setModel(this.customerAddressModel,"custAddModel");

                this.customerModel = this.getOwnerComponent().getModel("customerService");
                this.getView().setModel(this.customerModel,"CustomerModel");

                var showSection = new JSONModel();
                showSection.setData({
                    "selectedMode": ""
                });
                this.getView().setModel(showSection, "ShowSection");

                var model3 = new JSONModel();
                model3.setData({
                    "selectedMode": "Cash",
                    "cardPaymentMode" : 0
                });
                this.getView().setModel(model3, "ShowPaymentSection");
                this.validateLoggedInUser();
                this.shippingMethod = "";
                this.paymentEntSourceCounter = 0;
                this.paymentId = 0;
                this.sourceIdCounter = 0;
                this.aPaymentEntries = [];

            },
            validateLoggedInUser: function(){
                var that = this;
                this.oModel.read("/StoreIDSet", {
                    success: function(oData) {
                        that.storeID = oData.results[0] ? oData.results[0].Store : "";
                        that.plantID = oData.results[0] ? oData.results[0].Plant : "";
                        that.onPressPayments();
                    },
                    error: function(oError) {
                        sap.m.MessageBox.show(JSON.parse(oError.responseText).error.message.value,{
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
            onPressPayments: function() {
                if (!this._oDialogCashier) {
                    Fragment.load({
                        name: "com.eros.returnsales.fragment.cashier",
                        controller: this
                    }).then(function(oFragment) {
                        this._oDialogCashier = oFragment;
                        this.getView().addDependent(this._oDialogCashier);
                        this._oDialogCashier.open();
                    }.bind(this));
                } else {
                    this._oDialogCashier.open();
                }
            },
            fnCloseCashier: function() {
                this._oDialogCashier.close();
            },
            fnValidateCashier: function(oEvent) {
                var that = this;
                that.getView().byId("page").setVisible(false);
                var empId = oEvent.getSource().getParent().getContent()[0].getItems()[0].getContent()[1].getValue();
                var pwd = oEvent.getSource().getParent().getContent()[0].getItems()[0].getContent()[3].getValue();
                var aFilters=[];
                
                aFilters.push(new sap.ui.model.Filter("Etype", sap.ui.model.FilterOperator.EQ, "C"));
                aFilters.push(new sap.ui.model.Filter("EmployeeId", sap.ui.model.FilterOperator.EQ, empId));
                aFilters.push(new sap.ui.model.Filter("SecretCode", sap.ui.model.FilterOperator.EQ, pwd));
               //EmployeeSet?$filter=Etype eq 'C' and EmployeeId eq '112' and SecretCode eq 'Abc#91234'
                
                this.oModel.read("/EmployeeSet", {
                    filters: aFilters,
                    success: function(oData) {
                        that.cashierID = oData.results[0] ? oData.results[0].EmployeeId : "";
                        that.cashierName = oData.results[0] ? oData.results[0].EmployeeName : "";
                        that._oDialogCashier.close();
                        // that.getView().byId("cashier").setCount(oData.results[0].EmployeeName);
                        // that.getView().byId("tranNumber").setCount(oData.results[0].TransactionId);
                        that.getView().byId("page").setVisible(true);
                        
                    },
                    error: function(oError) {
                        that.getView().byId("page").setVisible(false);
                        if(JSON.parse(oError.responseText).error.code === "CASHIER_CHECK"){
                            sap.m.MessageBox.show(
                                JSON.parse(oError.responseText).error.message.value, {
                                    icon: sap.m.MessageBox.Icon.Error,
                                    title: "Cashier Validation",
                                    actions: ["OK", "CANCEL"],
                                    onClose: function(oAction) {
                                        
                                    }
                                }
                            );
                        }
                        else{
                            sap.m.MessageBox.show(
                                JSON.parse(oError.responseText).error.message.value, {
                                    icon: sap.m.MessageBox.Icon.Error,
                                    title: "Error",
                                    actions: ["OK", "CANCEL"],
                                    onClose: function(oAction) {
                                        
                                    }
                                }
                            );
                        }
                        console.error("Error", oError);
                    }
                });
               
            },
            onPressCustData: function() {
                var oModel = new sap.ui.model.json.JSONModel({
                    customerData: [{
                        option: "Basic Information"
                    },  {
                        option: "Customer Address"
                    }]
                });
                this.getView().setModel(oModel, "CustModel");
                if (!this._oDialogCust) {
                    Fragment.load({
                        name: "com.eros.returnsales.fragment.customer",
                        controller: this
                    }).then(function(oFragment) {
                        this._oDialogCust = oFragment;
                        this.getView().addDependent(this._oDialogCust);
                        this._oDialogCust.open();
                    }.bind(this));
                } else {
                    this._oDialogCust.open();
                }
    
            },
            onPressCustClose: function() {
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
                delete (data.shippingDate);
                delete (data.ShippingInst);
                delete (data.ShippingMethod);
                this.customerModel.create("/ZER_CUST_MASTERSet", data, {
                    success: function (oData) {
                        that._oDialogCust.close();
                        sap.m.MessageToast.show("Customer Update Successfully");
                    },
                    error: function (oError) {
                        sap.m.MessageToast.show("Error while Updating Customer");

                    }
                });

            },
            onOptionSelect: function(oEvent) {
                var sSelectedOption = oEvent.getSource().getTitle();
                var showSection = new JSONModel();
                showSection.setData({
                    "selectedMode": sSelectedOption
                });
                this.getView().setModel(showSection, "ShowSection");
                //	sap.m.MessageToast.show("Selected: " + sSelectedOption);
            },
            onSearchNumber: function(oEvent){
                var that=this;
                var searchNumber = oEvent.getParameter("query");
                this.customerModel.read("/ZER_CUST_MASTERSet(Kunnr='',MobNo='" + searchNumber + "')", {
                    success: function(oData) {
                        if(oData){
                             // this.getView().setModel(oModel1, "AddressModel");
                            that.getView().getModel("custAddModel").setData({});
                            that.getView().getModel("custAddModel").setData(oData);
                            that.getView().getModel("custAddModel").refresh();
                            that.getView().getModel("ShowSection").setProperty("/selectedMode","Basic Information");
    
                            if((oData.home_add1 !== "") || (oData.home_add2 !== "")){
                                that.getView().byId("addressRbGrp").selectedIndex("1");
                            }
                            else if((oData.off_add1 !== "") || (oData.off_add2 !== "")){
                                that.getView().byId("addressRbGrp").selectedIndex("2");
                               
                            }
                            else if((oData.oth_Add1 !== "") || (oData.oth_Add2 !== "")){
                                that.getView().byId("addressRbGrp").selectedIndex("3");
                                
                            }
                            else{
                                that.getView().byId("addressRbGrp").selectedIndex("1");
                            }
                            
                            
                        }
                        
                    },
                    error: function(oError) {
                        sap.m.MessageBox.show("Customer does not exist. Kindly add it",{
                            icon: sap.m.MessageBox.Icon.Error,
                            title: "Error",
                            actions: [MessageBox.Action.OK],
                            onClose: function (oAction) {
                                if (oAction === MessageBox.Action.OK) {
                                    that.getView().getModel("custAddModel").setData({});
                                    that.getView().getModel("ShowSection").setProperty("/selectedMode","Basic Information");
                                }
                            }
                        });
                    }
                });
            },
            onSelectAddressType: function(oEvent){
                if(oEvent.getParameter("selectedIndex") === 0){
                    sap.ui.getCore().byId("homeSection").setVisible(true);
                    sap.ui.getCore().byId("workSection").setVisible(false);
                    sap.ui.getCore().byId("otherSection").setVisible(false);
                }
                if(oEvent.getParameter("selectedIndex") === 1){
                    sap.ui.getCore().byId("homeSection").setVisible(false);
                    sap.ui.getCore().byId("workSection").setVisible(true);
                    sap.ui.getCore().byId("otherSection").setVisible(false);
                }
                if(oEvent.getParameter("selectedIndex") === 2){
                    sap.ui.getCore().byId("homeSection").setVisible(false);
                    sap.ui.getCore().byId("workSection").setVisible(false);
                    sap.ui.getCore().byId("otherSection").setVisible(true);
                }
            },
            onCustomerTypeChange: function(oEvent){
    
                if(oEvent.getParameter("selectedItem").getProperty("key") === "2"){
                    sap.ui.getCore().byId("cardTypelbl").setRequired(true);
                    sap.ui.getCore().byId("issuedBylbl").setRequired(true);
                    sap.ui.getCore().byId("cardNumberlbl").setRequired(true);
                }
                else{
                    sap.ui.getCore().byId("cardTypelbl").setRequired(false);
                    sap.ui.getCore().byId("issuedBylbl").setRequired(false);
                    sap.ui.getCore().byId("cardNumberlbl").setRequired(false);
                }
    
            }
        });
    });
