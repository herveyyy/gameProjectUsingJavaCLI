package classesAndSkill;



/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/**
 *
 * @author Z1nk
 */
public class MageClass {
    private String nameClass;
    private double defaultHP;
    private double defaultStamina;
    private double defaultMana;
    //progress and possesions
    private int defaultLevel;
    
    public String getNameClass(){
    this.nameClass = "Mage";
        return nameClass;
    }
    public double getDefaultHP(){
     this.defaultHP = 80;

        return defaultHP;
    }
    public double getDefaultStamina(){
     this.defaultStamina = 90;

        return defaultStamina;
    }
    public double getDefaultMana(){
     this.defaultMana = 120;
        return defaultMana;
        
    }
    public int getDefaultLevel(){
     this.defaultLevel = 1;
        return defaultLevel;
        
    }
    //skills

    public String skillFireBall() {
        throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
    }
   
}
