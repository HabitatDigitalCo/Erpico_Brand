/** @odoo-module **/

// D-33 — Home de ERPICO (client action `erpico_web_sidebar_home`).
// Se registra como Component en la categoría "actions": en Odoo 19
// `_executeClientAction` detecta `clientAction.prototype instanceof Component`
// y lo monta como controller de la acción.
import { Component, onWillStart, onWillUnmount, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { buildMenuIndex, resolveHomeCards } from "./nav_entries";

export class Home extends Component {
    static template = "erpico_web_sidebar.Home";
    static props = { "*": true };

    setup() {
        this.menuService = useService("menu");
        this.state = useState({ ready: false, cards: [] });
        this._onMenusChanged = this._onMenusChanged.bind(this);
        onWillStart(() => {
            // Misma resolución que el rail: si el usuario no ve Dashboards ni
            // CRM, esas cards no se renderizan (D-30).
            this.state.cards = resolveHomeCards(
                this.menuService,
                buildMenuIndex(this.menuService)
            );
            this.state.ready = true;
        });
        this.env.bus.addEventListener("MENUS:APP-CHANGED", this._onMenusChanged);
        onWillUnmount(() => {
            this.env.bus.removeEventListener("MENUS:APP-CHANGED", this._onMenusChanged);
        });
    }

    _onMenusChanged() {
        this.state.cards = resolveHomeCards(
            this.menuService,
            buildMenuIndex(this.menuService)
        );
    }

    openCard(card) {
        const leaf = card.leaf || card.menu;
        if (leaf) {
            this.menuService.selectMenu(leaf);
        }
    }
}

registry.category("actions").add("erpico_web_sidebar_home", Home);
